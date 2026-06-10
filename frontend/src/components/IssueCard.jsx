import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const priorityStyles = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const statusStyles = {
  open: 'bg-blue-100 text-blue-700',
  'in-progress': 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-emerald-100 text-emerald-700',
};

export default function IssueCard({ issue }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = user?.role === 'admin' ? '/admin' : '/tenant';

  return (
    <div
      onClick={() => navigate(`${basePath}/issues/${issue._id}`)}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md cursor-pointer transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-800 text-sm leading-snug">{issue.title}</h3>
        {user?.role === 'admin' && (
          <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${priorityStyles[issue.priority]}`}>
            {issue.priority}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{issue.description}</p>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyles[issue.status]}`}>
            {issue.status.replace('-', ' ')}
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{issue.category}</span>
        </div>
        <div className="text-right">
          {user?.role === 'admin' && (
            <p className="text-xs text-gray-500">{issue.tenantId?.name} · {issue.unit}</p>
          )}
          <p className="text-xs text-gray-400">{new Date(issue.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
