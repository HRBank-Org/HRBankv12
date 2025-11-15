import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const BulkInvite = () => {
  const [invites, setInvites] = useState([{ full_name: '', email: '', phone: '', program: '', graduation_year: '' }]);
  const [uploadMode, setUploadMode] = useState('manual'); // manual or csv
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\\n');
        
        // Skip header row
        const dataLines = lines.slice(1).filter(line => line.trim());
        
        const parsedInvites = dataLines.map(line => {
          const [full_name, email, phone, program, graduation_year] = line.split(',').map(s => s.trim());
          return { full_name, email, phone, program, graduation_year };
        });

        if (parsedInvites.length > 0) {
          setInvites(parsedInvites);
          setUploadMode('csv');
          alert(`Loaded ${parsedInvites.length} students from CSV`);
        }
      } catch (error) {
        alert('Failed to parse CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const addRow = () => {
    setInvites([...invites, { full_name: '', email: '', phone: '', program: '', graduation_year: '' }]);
  };

  const updateRow = (index, field, value) => {
    const updated = [...invites];
    updated[index][field] = value;
    setInvites(updated);
  };

  const removeRow = (index) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const response = await api.post('/api/invites/bulk-upload', {
        file_name: 'manual_entry.csv',
        invites: invites.filter(inv => inv.email && inv.full_name)
      });

      setResult(response.data.data);
      alert(`Successfully sent ${response.data.data.successful_invites} invitations!`);
    } catch (error) {
      alert('Failed to send invitations');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Create CSV content
    const csvContent = [
      'full_name,email,phone,program,graduation_year',
      'John Doe,john@example.com,+1-519-555-0001,Personal Support Worker,2024',
      'Jane Smith,jane@example.com,+1-519-555-0002,Culinary Arts,2024',
      'Mike Johnson,mike@example.com,+1-519-555-0003,Security Guard,2023'
    ].join('\n');
    
    // Create blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hr_bank_student_invite_template.csv';
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    console.log('CSV template download triggered');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/institution/dashboard')} className="hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold">Invite Students/Graduates</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Bulk Invite Students</h2>
              <p className="text-gray-600 mt-1">
                Invite your students and graduates to join HR Bank and find employment
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={downloadTemplate}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                📥 Download CSV Template
              </button>
              <label className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
                     style={{ backgroundColor: theme.primaryColor }}>
                📤 Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* CSV Upload Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">
                  {uploadMode === 'csv' ? '✅ CSV Loaded' : 'CSV Format:'}
                </h3>
                {uploadMode === 'csv' ? (
                  <div className="text-sm text-blue-800">
                    <p><strong>{invites.length} students loaded from CSV</strong></p>
                    <p className="text-xs mt-1">Review the table below and click Send to invite them all.</p>
                  </div>
                ) : (
                  <div className="text-sm text-blue-800">
                    <p className="mb-2">
                      <strong>Columns:</strong> full_name, email, phone, program, graduation_year
                    </p>
                    <p className="text-xs">
                      Example: John Doe, john@example.com, +1-519-555-0001, Personal Support Worker, 2024
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Manual Entry Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grad Year</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invites.map((invite, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={invite.full_name}
                          onChange={(e) => updateRow(index, 'full_name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="John Doe"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="email"
                          value={invite.email}
                          onChange={(e) => updateRow(index, 'email', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="john@example.com"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="tel"
                          value={invite.phone}
                          onChange={(e) => updateRow(index, 'phone', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="+1-519-555-0001"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={invite.program}
                          onChange={(e) => updateRow(index, 'program', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="PSW"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={invite.graduation_year}
                          onChange={(e) => updateRow(index, 'graduation_year', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="2024"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {invites.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={addRow}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 transition-colors"
            >
              + Add Another Person
            </button>

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-2">Invitations Sent!</h3>
                <p className="text-sm text-green-800">
                  Successfully sent <strong>{result.successful_invites}</strong> invitations
                  {result.failed_rows > 0 && ` (${result.failed_rows} failed)`}
                </p>
              </div>
            )}

            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/institution/dashboard')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || invites.filter(i => i.email && i.full_name).length === 0}
                className="flex-1 py-3 rounded-lg text-white font-semibold disabled:opacity-50"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {uploading ? 'Sending Invitations...' : `Send ${invites.filter(i => i.email && i.full_name).length} Invitation(s)`}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default BulkInvite;
