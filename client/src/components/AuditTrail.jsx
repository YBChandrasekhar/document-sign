import { useEffect, useState } from 'react';
import api from '../api/axios';

const actionColors = {
  uploaded:  'bg-blue-100 text-blue-700',
  finalized: 'bg-green-100 text-green-700',
  signed:    'bg-purple-100 text-purple-700',
  shared:    'bg-yellow-100 text-yellow-700',
  rejected:  'bg-red-100 text-red-700',
};

const actionLabels = {
  uploaded:  'Uploaded',
  finalized: 'Finalized',
  signed:    'Signed',
  shared:    'Shared',
  rejected:  'Rejected',
};

export default function AuditTrail({ docId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/api/audit/${docId}`);
        setLogs(res.data);
      } catch (_) {}
      finally { setLoading(false); }
    };
    fetch();
  }, [docId]);

  if (loading)
    return <p className="text-gray-400 text-xs text-center py-2">Loading audit trail...</p>;

  if (logs.length === 0)
    return <p className="text-gray-400 text-xs text-center py-2">No activity yet</p>;

  return (
    <ul className="space-y-2 max-h-48 overflow-y-auto">
      {logs.map((log) => (
        <li key={log.id} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className={`px-2 py-0.5 rounded-full font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}>
              {actionLabels[log.action] || log.action}
            </span>
            <span className="text-gray-400">
              {new Date(log.created_at).toLocaleString()}
            </span>
          </div>
          <p className="text-gray-600">{log.actor_name || log.actor_email}</p>
          {log.ip_address && (
            <p className="text-gray-400">IP: {log.ip_address}</p>
          )}
          {log.notes && (
            <p className="text-red-400 mt-1">Reason: {log.notes}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
