import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocuments } from '../hooks/useDocuments'
import {
  Plus,
  Search,
  FileText,
  Trash2,
  Star,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { DocumentsIllust } from '../components/illustrations'

export default function Documents() {
  const { documents, loading, deleteDocument, updateDocument } = useDocuments()
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const navigate = useNavigate()

  const allTags = [...new Set(documents.flatMap((d) => d.tags || []))].sort()

  const filtered = documents
    .filter((doc) => doc.title.toLowerCase().includes(search.toLowerCase()))
    .filter((doc) => !filterTag || (doc.tags && doc.tags.includes(filterTag)))

  function handleDelete(e, id) {
    e.stopPropagation()
    if (confirm('Delete this document?')) {
      deleteDocument(id)
    }
  }

  function handleFavorite(e, doc) {
    e.stopPropagation()
    updateDocument(doc.id, { is_favorite: !doc.is_favorite })
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl px-6 sm:px-8 py-5 flex items-center justify-between gap-4 mb-8 overflow-hidden">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-500 text-sm mt-1">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <DocumentsIllust className="hidden lg:block w-36 h-24 flex-shrink-0 opacity-20" />
        </div>
        <button
          onClick={() => navigate('/documents/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-800 rounded-xl text-sm font-medium text-white transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Document
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents…"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/40 focus:border-gray-400 transition-all"
        />
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <span className="text-xs text-gray-400 font-medium">Tags:</span>
          <button
            onClick={() => setFilterTag('')}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
              !filterTag
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                filterTag === tag
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <FileText className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">
            {search ? 'No documents match your search' : 'No documents yet'}
          </p>
          {!search && (
            <button
              onClick={() => navigate('/documents/new')}
              className="mt-4 text-gray-900 hover:text-black text-sm font-medium transition-colors"
            >
              Create your first document →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              onClick={() => navigate(`/documents/${doc.id}`)}
              className="group flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl cursor-pointer transition-all duration-150 shadow-sm"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-gray-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate group-hover:text-gray-900 transition-colors">
                  {doc.title || 'Untitled'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {format(new Date(doc.updated_at || doc.created_at), 'MMM d, yyyy · h:mm a')}
                  </span>
                </div>
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {doc.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-100">
                        #{tag}
                      </span>
                    ))}
                    {doc.tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{doc.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={(e) => handleFavorite(e, doc)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    doc.is_favorite
                      ? 'text-gray-900'
                      : 'text-gray-400 hover:text-gray-900'
                  }`}
                >
                  <Star className="w-4 h-4" fill={doc.is_favorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={(e) => handleDelete(e, doc.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
