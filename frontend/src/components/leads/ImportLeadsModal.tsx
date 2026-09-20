import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { ColumnMapping, ParsedFilePreview, ImportLeadsResponse } from '@mailflow/shared';
import { leadService } from '../../services/lead.service';
import { Button, Modal, Select, Badge, Loader } from '../ui';
import { useToast } from '../../hooks/useToast';

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newImportHistoryId?: string) => void;
}

type Step = 'UPLOAD' | 'PREVIEW' | 'COMPLETE';

const STANDARD_FIELDS = [
  { key: 'name', label: 'Contact Name' },
  { key: 'email', label: 'Email Address' },
  { key: 'company', label: 'Company Name' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'website', label: 'Website URL' },
  { key: 'linkedin', label: 'LinkedIn Profile' },
  { key: 'industry', label: 'Industry / Sector' },
];

export function ImportLeadsModal({ isOpen, onClose, onSuccess }: ImportLeadsModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('UPLOAD');
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ParsedFilePreview | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [showAdvancedMapping, setShowAdvancedMapping] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportLeadsResponse | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const resetState = () => {
    setStep('UPLOAD');
    setSelectedFile(null);
    setPreviewData(null);
    setColumnMapping({});
    setShowAdvancedMapping(false);
    setImportSummary(null);
    setIsLoading(false);
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  const processSelectedFile = async (file: File) => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      toast.error('Invalid file format. Please upload a .csv, .xlsx, or .xls file.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds the 15MB limit.');
      return;
    }

    setSelectedFile(file);
    setIsLoading(true);

    try {
      const preview = await leadService.uploadPreview(file);
      setPreviewData(preview);
      setColumnMapping(preview.autoMapping || {});
      setStep('PREVIEW');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      toast.error(errorObj.response?.data?.error ?? 'Failed to parse file structure.');
      setSelectedFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !previewData) return;

    setIsLoading(true);
    try {
      // 1. Validate mapping & parse rows
      const validationResult = await leadService.validateMapping(selectedFile, columnMapping);

      // 2. Import into database
      const response = await leadService.importLeads({
        fileName: previewData.fileName,
        fileSize: previewData.fileSize,
        totalRows: validationResult.totalRows,
        uploadedColumns: previewData.headers,
        validLeads: validationResult.validLeads,
        duplicateCount: validationResult.duplicateCount,
        failedCount: validationResult.invalidCount,
      });

      setImportSummary(response);
      setStep('COMPLETE');
      toast.success(`Import complete! ${response.importedCount} leads added.`);
      onSuccess(response.importHistoryId);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      toast.error(errorObj.response?.data?.error ?? 'Failed to import leads.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleModalClose}
      title={
        step === 'UPLOAD'
          ? 'Upload Leads File'
          : step === 'PREVIEW'
            ? 'Spreadsheet Preview & Import'
            : 'Import Completed'
      }
      size="xl"
    >
      <div className="space-y-6">
        {step === 'UPLOAD' && (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-brand-500 bg-brand-500/5'
                  : 'border-[var(--surface-border)] hover:border-zinc-500 bg-[var(--surface-elevated)]/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center mx-auto mb-3 text-brand-400">
                <svg
                  className="w-6 h-6 text-brand-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p className="text-base font-semibold text-[var(--content-primary)]">
                Drag and drop your spreadsheet here
              </p>
              <p className="text-xs text-[var(--content-secondary)] mt-1">
                Supports Excel (.xlsx, .xls) and CSV (.csv) from any industry
              </p>
              <div className="mt-4">
                <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  Browse Files
                </Button>
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center gap-3 py-4 text-sm text-[var(--content-secondary)]">
                <Loader size="sm" />
                Reading spreadsheet structure...
              </div>
            )}
          </div>
        )}

        {step === 'PREVIEW' && previewData && (
          <div className="space-y-5">
            {/* Header info bar */}
            <div className="p-3.5 bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-xl text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <strong className="text-[var(--content-primary)] text-sm font-semibold mr-2">
                    {previewData.fileName}
                  </strong>
                  <span className="text-[var(--content-secondary)]">
                    ({previewData.totalRows} {previewData.totalRows === 1 ? 'row' : 'rows'}{' '}
                    detected)
                  </span>
                </div>
              </div>
              <Badge variant="info">{previewData.headers.length} Columns Detected</Badge>
            </div>

            {/* Direct Spreadsheet Table Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[var(--content-primary)]">
                  Spreadsheet Preview (First {Math.min(previewData.sampleRows.length, 5)} Rows)
                </h4>
                <span className="text-[11px] text-[var(--content-tertiary)]">
                  All {previewData.headers.length} columns will appear in your Leads table exactly
                  as shown
                </span>
              </div>

              <div className="overflow-x-auto border border-[var(--surface-border)] rounded-xl max-h-72">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[var(--surface-elevated)] sticky top-0 z-10 text-[var(--content-secondary)]">
                    <tr>
                      <th className="px-3.5 py-2.5 font-semibold text-[var(--content-tertiary)] border-b border-[var(--surface-border)] w-12 text-center">
                        #
                      </th>
                      {previewData.headers.map((h) => (
                        <th
                          key={h}
                          className="px-3.5 py-2.5 font-semibold text-[var(--content-primary)] border-b border-[var(--surface-border)] whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.sampleRows.slice(0, 5).map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-[var(--surface-border)] last:border-0 hover:bg-[var(--surface-elevated)]/40 transition-colors"
                      >
                        <td className="px-3.5 py-2 text-center text-[var(--content-tertiary)] font-mono text-[11px]">
                          {i + 1}
                        </td>
                        {previewData.headers.map((h) => (
                          <td
                            key={h}
                            className="px-3.5 py-2 whitespace-nowrap max-w-[200px] truncate text-[var(--content-secondary)]"
                            title={row[h]}
                          >
                            {row[h] !== undefined && row[h] !== '' ? (
                              row[h]
                            ) : (
                              <span className="text-[var(--content-tertiary)] italic">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Optional Collapsible Advanced Field Mapping */}
            <div className="border border-[var(--surface-border)] rounded-xl overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setShowAdvancedMapping((prev) => !prev)}
                className="w-full px-4 py-2.5 bg-[var(--surface-elevated)]/60 hover:bg-[var(--surface-elevated)] flex items-center justify-between text-[var(--content-secondary)] font-medium transition-colors"
              >
                <span>⚙ Advanced: Standard CRM Field Mapping (Optional)</span>
                <span className="text-[10px] text-[var(--content-tertiary)]">
                  {showAdvancedMapping ? '▲ Hide' : '▼ Show'}
                </span>
              </button>

              {showAdvancedMapping && (
                <div className="p-4 space-y-3 bg-[var(--surface-card)]">
                  <p className="text-[11px] text-[var(--content-tertiary)]">
                    MailFlow automatically connects relevant columns for AI research and campaign
                    fallbacks. All your original columns will be preserved regardless of mapping.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                    {STANDARD_FIELDS.map((field) => {
                      const options = [
                        { value: '', label: '-- Do Not Map --' },
                        ...previewData.headers.map((h) => ({ value: h, label: h })),
                      ];

                      return (
                        <div key={field.key} className="space-y-1">
                          <Select
                            label={field.label}
                            options={options}
                            value={columnMapping[field.key] ?? ''}
                            onChange={(val) =>
                              setColumnMapping({ ...columnMapping, [field.key]: val })
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-between items-center pt-3 border-t border-[var(--surface-border)]">
              <Button variant="ghost" onClick={() => setStep('UPLOAD')}>
                Back
              </Button>
              <Button variant="primary" onClick={handleImport} loading={isLoading}>
                Import {previewData.totalRows} Leads
              </Button>
            </div>
          </div>
        )}

        {step === 'COMPLETE' && importSummary && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-3xl mx-auto">
              ✓
            </div>
            <h3 className="text-xl font-bold text-[var(--content-primary)]">Import Successful!</h3>
            <p className="text-sm text-[var(--content-secondary)]">
              {importSummary.importedCount} leads were successfully added to your database.
            </p>

            <div className="pt-4">
              <Button onClick={handleModalClose}>View Leads Table</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
