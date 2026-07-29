import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  ColumnMapping,
  ParsedFilePreview,
  LeadValidationResult,
  ImportLeadsResponse,
} from '@mailflow/shared';
import { leadService } from '../../services/lead.service';
import { Button, Modal, Select, Badge, Card, Loader } from '../ui';
import { useToast } from '../../hooks/useToast';

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'UPLOAD' | 'MAPPING' | 'VALIDATION' | 'COMPLETE';

const STANDARD_FIELDS = [
  { key: 'name', label: 'Contact Name *', required: true },
  { key: 'email', label: 'Email Address *', required: true },
  { key: 'company', label: 'Company Name', required: false },
  { key: 'phone', label: 'Phone Number', required: false },
  { key: 'website', label: 'Website URL', required: false },
  { key: 'linkedin', label: 'LinkedIn Profile', required: false },
  { key: 'industry', label: 'Industry / Sector', required: false },
];

export function ImportLeadsModal({ isOpen, onClose, onSuccess }: ImportLeadsModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('UPLOAD');
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ParsedFilePreview | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ name: '', email: '' });
  const [validationResult, setValidationResult] = useState<LeadValidationResult | null>(null);
  const [importSummary, setImportSummary] = useState<ImportLeadsResponse | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const resetState = () => {
    setStep('UPLOAD');
    setSelectedFile(null);
    setPreviewData(null);
    setColumnMapping({ name: '', email: '' });
    setValidationResult(null);
    setImportSummary(null);
    setIsLoading(false);
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  // ── STEP 1: File Selection & Upload ──
  const processSelectedFile = async (file: File) => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      toast.error('Invalid file format. Please upload a .csv, .xlsx, or .xls file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10MB limit.');
      return;
    }

    setSelectedFile(file);
    setIsLoading(true);

    try {
      const preview = await leadService.uploadPreview(file);
      setPreviewData(preview);
      setColumnMapping(preview.autoMapping);
      setStep('MAPPING');
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

  // ── STEP 2: Mapping Validation ──
  const handleValidateMapping = async () => {
    if (!columnMapping.name || !columnMapping.email) {
      toast.error('Please map both Name and Email columns before proceeding.');
      return;
    }

    if (!selectedFile) return;

    setIsLoading(true);
    try {
      const result = await leadService.validateMapping(selectedFile, columnMapping);
      setValidationResult(result);
      setStep('VALIDATION');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      toast.error(errorObj.response?.data?.error ?? 'Validation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── STEP 3: Confirm Import ──
  const handleConfirmImport = async () => {
    if (!validationResult || !selectedFile || !previewData) return;

    setIsLoading(true);
    try {
      const response = await leadService.importLeads({
        fileName: previewData.fileName,
        fileSize: previewData.fileSize,
        totalRows: validationResult.totalRows,
        validLeads: validationResult.validLeads,
        duplicateCount: validationResult.duplicateCount,
        failedCount: validationResult.invalidCount,
      });

      setImportSummary(response);
      setStep('COMPLETE');
      toast.success(`Import complete! ${response.importedCount} leads added.`);
      onSuccess();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      toast.error(errorObj.response?.data?.error ?? 'Failed to import leads into database.');
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
          : step === 'MAPPING'
            ? 'Smart Column Mapping'
            : step === 'VALIDATION'
              ? 'Lead Validation & Duplicate Check'
              : 'Import Completed'
      }
      size="xl"
    >
      <div className="space-y-6">
        {/* Stepper Progress Bar */}
        <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-4 text-xs font-medium text-[var(--content-tertiary)]">
          <div
            className={`flex items-center gap-2 ${step === 'UPLOAD' ? 'text-brand-400 font-semibold' : ''}`}
          >
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center">
              1
            </span>
            Upload File
          </div>
          <span className="text-zinc-600">→</span>
          <div
            className={`flex items-center gap-2 ${step === 'MAPPING' ? 'text-brand-400 font-semibold' : ''}`}
          >
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center">
              2
            </span>
            Column Mapping
          </div>
          <span className="text-zinc-600">→</span>
          <div
            className={`flex items-center gap-2 ${step === 'VALIDATION' ? 'text-brand-400 font-semibold' : ''}`}
          >
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center">
              3
            </span>
            Validation
          </div>
        </div>

        {/* ── STEP 1: FILE UPLOAD ── */}
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
              <div className="w-12 h-12 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center mx-auto mb-3 text-brand-400 text-xl">
                📁
              </div>
              <p className="text-base font-semibold text-[var(--content-primary)]">
                Drag and drop your lead file here
              </p>
              <p className="text-xs text-[var(--content-secondary)] mt-1">
                Supports CSV, XLSX, and XLS files up to 10MB
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
                Parsing file headers & structure...
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: SMART COLUMN MAPPING ── */}
        {step === 'MAPPING' && previewData && (
          <div className="space-y-6">
            <div className="p-3 bg-[var(--surface-elevated)] rounded-lg text-xs text-[var(--content-secondary)] flex items-center justify-between">
              <div>
                File:{' '}
                <strong className="text-[var(--content-primary)]">{previewData.fileName}</strong> (
                {previewData.totalRows} rows)
              </div>
              <Badge variant="info">Auto-detected</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      onChange={(val) => setColumnMapping({ ...columnMapping, [field.key]: val })}
                    />
                  </div>
                );
              })}
            </div>

            {/* Sample Data Preview Table */}
            {previewData.sampleRows.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[var(--content-primary)]">
                  Sample Data Preview (First 3 Rows)
                </h4>
                <div className="overflow-x-auto border border-[var(--surface-border)] rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[var(--surface-elevated)] text-[var(--content-secondary)]">
                      <tr>
                        {previewData.headers.map((h) => (
                          <th key={h} className="px-3 py-2 border-b border-[var(--surface-border)]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.sampleRows.slice(0, 3).map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-[var(--surface-border)] last:border-0"
                        >
                          {previewData.headers.map((h) => (
                            <td key={h} className="px-3 py-2 truncate max-w-[150px]">
                              {row[h] || (
                                <span className="text-[var(--content-tertiary)] italic">empty</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-[var(--surface-border)]">
              <Button variant="ghost" onClick={() => setStep('UPLOAD')}>
                Back
              </Button>
              <Button onClick={handleValidateMapping} loading={isLoading}>
                Validate & Check Duplicates
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: VALIDATION & DUPLICATES ── */}
        {step === 'VALIDATION' && validationResult && (
          <div className="space-y-6">
            {/* Stat Overview Cards */}
            <div className="grid grid-cols-4 gap-3">
              <Card variant="default" className="p-3 text-center">
                <span className="text-xs text-[var(--content-tertiary)]">Total Rows</span>
                <p className="text-xl font-bold text-[var(--content-primary)]">
                  {validationResult.totalRows}
                </p>
              </Card>
              <Card variant="default" className="p-3 text-center border-green-500/30">
                <span className="text-xs text-green-400">Valid Leads</span>
                <p className="text-xl font-bold text-green-400">{validationResult.validCount}</p>
              </Card>
              <Card variant="default" className="p-3 text-center border-amber-500/30">
                <span className="text-xs text-amber-400">Duplicates (Skipped)</span>
                <p className="text-xl font-bold text-amber-400">
                  {validationResult.duplicateCount}
                </p>
              </Card>
              <Card variant="default" className="p-3 text-center border-red-500/30">
                <span className="text-xs text-red-400">Invalid Rows</span>
                <p className="text-xl font-bold text-red-400">{validationResult.invalidCount}</p>
              </Card>
            </div>

            {/* Invalid rows display if any */}
            {validationResult.invalidRows.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-red-400">
                  Invalid Rows Detected ({validationResult.invalidRows.length})
                </h4>
                <div className="max-h-36 overflow-y-auto border border-red-500/30 rounded-lg p-2 space-y-1 bg-red-500/5">
                  {validationResult.invalidRows.map((inv, idx) => (
                    <div
                      key={idx}
                      className="text-xs flex items-center justify-between border-b border-red-500/10 pb-1 last:border-0"
                    >
                      <span className="text-[var(--content-primary)] font-mono">
                        Row #{inv.rowNumber}
                      </span>
                      <span className="text-red-400">{inv.reasons.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-[var(--surface-border)]">
              <Button variant="ghost" onClick={() => setStep('MAPPING')}>
                Back to Mapping
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmImport}
                loading={isLoading}
                disabled={validationResult.validCount === 0}
              >
                Import {validationResult.validCount} Valid Leads
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: COMPLETE ── */}
        {step === 'COMPLETE' && importSummary && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-3xl mx-auto">
              ✓
            </div>
            <h3 className="text-xl font-bold text-[var(--content-primary)]">Import Successful!</h3>
            <p className="text-sm text-[var(--content-secondary)]">
              {importSummary.importedCount} leads were successfully added to your database.
            </p>

            <div className="pt-4">
              <Button onClick={handleModalClose}>Done & View Dashboard</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
