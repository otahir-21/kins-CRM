const { getFCMTokens } = require('../../notifications-helpers');
const { sendMulticast, getMissingFirebaseEnv } = require('../../services/firebaseAdmin');
const { isValidObjectId } = require('../../utils/validateObjectId');

/**
 * POST /api/v1/chat/notify
 * Send FCM to recipients for a new chat message. Call after writing the message to Firestore.
 * Body:
 *   type: "chat_1_1" | "chat_group"
 *   recipientIds: string[] (MongoDB user ids; sender can be excluded or included – we skip sending to self if senderId matches)
 *   senderId: string
 *   senderName: string
 *   senderProfilePicture?: string (optional, for 1:1)
 *   messagePreview: string
 *   conversationId?: string (required if type === "chat_1_1")
 *   groupId?: string, groupName?: string (required if type === "chat_group")
 */
async function chatNotify(req, res) {
  try {
    const { type, recipientIds, senderId, senderName, senderProfilePicture, messagePreview, conversationId, groupId, groupName } = req.body;

    if (!type || !recipientIds || !Array.isArray(recipientIds) || !senderId || senderName === undefined || messagePreview === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid: type, recipientIds (array), senderId, senderName, messagePreview.',
      });
    }

    if (type !== 'chat_1_1' && type !== 'chat_group') {
      return res.status(400).json({ success: false, error: 'type must be chat_1_1 or chat_group.' });
    }

    if (type === 'chat_1_1' && !conversationId) {
      return res.status(400).json({ success: false, error: 'conversationId required for chat_1_1.' });
    }
    if (type === 'chat_group' && (!groupId || !groupName)) {
      return res.status(400).json({ success: false, error: 'groupId and groupName required for chat_group.' });
    }

    const senderIdStr = String(senderId);
    const recipientIdStrs = recipientIds
      .filter((id) => id && typeof id === 'string' && isValidObjectId(id))
      .map((id) => id.toString());
    const recipientsToNotify = recipientIdStrs.filter((id) => id !== senderIdStr);
    if (recipientsToNotify.length === 0) {
      return res.status(200).json({ success: true, message: 'No recipients to notify.', successCount: 0, failureCount: 0 });
    }

    const data = {
      type,
      senderId: senderIdStr,
      senderName: String(senderName ?? ''),
      messagePreview: String(messagePreview ?? '').slice(0, 200),
    };
    if (type === 'chat_1_1') {
      data.conversationId = String(conversationId);
      data.senderProfilePicture = senderProfilePicture != null ? String(senderProfilePicture) : '';
    } else {
      data.groupId = String(groupId);
      data.groupName = String(groupName ?? '');
    }

    const tokens = await getFCMTokens(recipientsToNotify);
    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'No FCM tokens for recipients.', successCount: 0, failureCount: 0 });
    }

    const missing = getMissingFirebaseEnv();
    if (missing.length) {
      return res.status(503).json({
        success: false,
        error: `Firebase not configured. Missing: ${missing.join(', ')}.`,
        missing,
      });
    }

    const title = type === 'chat_1_1' ? String(senderName ?? '') : `${senderName} in ${groupName}`.slice(0, 80);
    const result = await sendMulticast(tokens, data, { title, body: data.messagePreview });

    return res.status(200).json({
      success: true,
      successCount: result.successCount,
      failureCount: result.failureCount,
      errors: result.errors,
    });
  } catch (err) {
    console.error('POST /api/v1/chat/notify error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to send chat notification.' });
  }
}

module.exports = { chatNotify };
