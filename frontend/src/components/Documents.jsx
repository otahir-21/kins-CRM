import { useEffect, useState } from 'react';
import { FileText, Download, User, Calendar, Search, Filter } from 'lucide-react';
import { apiService } from '../utils/api';
import { formatFirestoreDateTime } from '../utils/dateHelpers';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [searchTerm, documents]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      // Get all users with documents
      const response = await apiService.getUsersWithDocuments();
      const users = response.data.data || [];
      
      // Flatten documents from all users
      const allDocuments = [];
      for (const user of users) {
        if (user.documents && user.documents.length > 0) {
          user.documents.forEach(doc => {
            allDocuments.push({
              ...doc,
              userId: user.id,
              userName: user.name,
              userPhone: user.phoneNumber || user.auth?.phoneNumber
            });
          });
        } else if (user.documentUrl) {
          allDocuments.push({
            url: user.documentUrl,
            fileName: user.documentUrl.split('/').pop(),
            userId: user.id,
            userName: user.name,
            userPhone: user.phoneNumber || user.auth?.phoneNumber
          });
        }
      }
      
      setDocuments(allDocuments);
      setFilteredDocuments(allDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Dummy data
      const dummyDocs = [
        {
          id: '1',
          url: 'https://example.com/doc1.pdf',
          fileName: 'emirates_id_john.pdf',
          uploadedAt: '2024-01-15T10:30:00Z',
          size: 245678,
          userId: '1',
          userName: 'John Doe',
          userPhone: '+971507276823'
        },
        {
          id: '2',
          url: 'https://example.com/doc2.pdf',
          fileName: 'passport_jane.pdf',
          uploadedAt: '2024-01-20T14:20:00Z',
          size: 312456,
          userId: '2',
          userName: 'Jane Smith',
          userPhone: '+971501234567'
        }
      ];
      setDocuments(dummyDocs);
      setFilteredDocuments(dummyDocs);
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    if (!searchTerm) {
      setFilteredDocuments(documents);
      return;
    }

    const filtered = documents.filter(doc =>
      doc.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.userPhone?.includes(searchTerm)
    );

    setFilteredDocuments(filtered);
  };

  // formatDate is now handled by formatFirestoreDateTime utility

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Documents</h1>
        <p className="text-gray-600 mt-2">View and manage all uploaded documents</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by file name, user name, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Showing <span className="font-semibold">{filteredDocuments.length}</span> of <span className="font-semibold">{documents.length}</span> documents
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No documents found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc, index) => (
            <div key={doc.id || index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-primary-100 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-gray-900 truncate max-w-[200px]">
                      {doc.fileName || 'Document'}
                    </h3>
                    <p className="text-sm text-gray-500">{formatFileSize(doc.size)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="w-4 h-4 mr-2" />
                  <span className="truncate">{doc.userName || 'Unknown User'}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{formatFirestoreDateTime(doc.uploadedAt)}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </a>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Documents;
