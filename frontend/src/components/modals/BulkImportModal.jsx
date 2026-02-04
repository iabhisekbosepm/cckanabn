import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { tasksApi } from '../../api/tasks';
import toast from 'react-hot-toast';

const EXAMPLE_TEXT = `Done:
1. Task one completed
2. Task two completed

In Progress:
- Working on feature X - Discussion with team
- Bug fix for login page

To Do:
- New feature request
- Documentation update`;

function BulkImportModal({ isOpen, onClose, projectId, onSuccess }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('input'); // 'input' | 'preview'

  const handlePreview = async () => {
    if (!text.trim()) {
      toast.error('Please enter some text to import');
      return;
    }

    setIsLoading(true);
    try {
      const result = await tasksApi.previewImport(text);
      setPreview(result);
      setStep('preview');
    } catch (error) {
      toast.error(error.message || 'Failed to parse text');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setIsLoading(true);
    try {
      const result = await tasksApi.bulkImport(projectId, text);
      toast.success(`Imported ${result.tasksCreated} tasks into ${result.details.length} columns`);
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error(error.message || 'Failed to import tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setText('');
    setPreview(null);
    setStep('input');
    onClose();
  };

  const handleBack = () => {
    setStep('input');
    setPreview(null);
  };

  const loadExample = () => {
    setText(EXAMPLE_TEXT);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Import Tasks">
      {step === 'input' ? (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Paste your tasks
              </label>
              <button
                type="button"
                onClick={loadExample}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Load example
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Format:
Column Name:
1. Task one
2. Task two - with notes

Another Column:
- Task three
- Task four`}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <p className="font-medium mb-1">Supported format:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Column names end with a colon (e.g., "To Do:")</li>
              <li>Tasks can be numbered (1. 2.) or bulleted (- or *)</li>
              <li>Add notes with a dash (Task - notes go here)</li>
              <li>New columns are created automatically</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handlePreview} disabled={isLoading || !text.trim()}>
              {isLoading ? 'Parsing...' : 'Preview Import'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-medium">
              Ready to import {preview?.taskCount} tasks into {preview?.columns?.length} columns
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-3">
            {preview?.columns?.map((column) => (
              <div key={column} className="border border-gray-200 rounded-lg p-3">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  {column}
                  <span className="text-xs text-gray-500 font-normal">
                    ({preview.parsed[column]?.length} tasks)
                  </span>
                </h4>
                <ul className="space-y-1">
                  {preview.parsed[column]?.map((task, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <div>
                        <span>{task.title}</span>
                        {task.description && (
                          <span className="text-gray-400 text-xs ml-1">
                            — {task.description}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={handleBack}>
              ← Back to edit
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isLoading}>
                {isLoading ? 'Importing...' : 'Import Tasks'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default BulkImportModal;
