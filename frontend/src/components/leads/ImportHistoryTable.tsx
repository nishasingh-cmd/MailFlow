import { ImportHistory } from '@mailflow/shared';
import { Table, Column, Badge, EmptyState } from '../ui';

interface ImportHistoryTableProps {
  history: ImportHistory[];
  isLoading: boolean;
}

export function ImportHistoryTable({ history, isLoading }: ImportHistoryTableProps) {
  if (!isLoading && history.length === 0) {
    return (
      <EmptyState
        title="No import history found"
        description="You have not uploaded any CSV or Excel lead files yet."
      />
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const columns: Column<ImportHistory>[] = [
    {
      key: 'fileName',
      header: 'File Name',
      render: (item) => (
        <span className="font-semibold text-[var(--content-primary)]">📄 {item.fileName}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Upload Date',
      render: (item) => (
        <span className="text-xs text-[var(--content-secondary)]">
          {new Date(item.createdAt).toLocaleDateString()}{' '}
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'fileSize',
      header: 'File Size',
      render: (item) => (
        <span className="text-xs font-mono text-[var(--content-secondary)]">
          {formatFileSize(item.fileSize)}
        </span>
      ),
    },
    {
      key: 'totalRows',
      header: 'Total Rows',
      render: (item) => <span className="font-mono">{item.totalRows}</span>,
    },
    {
      key: 'importedCount',
      header: 'Imported',
      render: (item) => <Badge variant="success">+{item.importedCount} leads</Badge>,
    },
    {
      key: 'duplicateCount',
      header: 'Duplicates',
      render: (item) =>
        item.duplicateCount > 0 ? (
          <Badge variant="warning">{item.duplicateCount} skipped</Badge>
        ) : (
          <span className="text-xs text-[var(--content-tertiary)]">0</span>
        ),
    },
    {
      key: 'failedCount',
      header: 'Failed',
      render: (item) =>
        item.failedCount > 0 ? (
          <Badge variant="error">{item.failedCount} failed</Badge>
        ) : (
          <span className="text-xs text-[var(--content-tertiary)]">0</span>
        ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={history}
      loading={isLoading}
      keyExtractor={(item) => item.id}
      emptyText="No import history found"
    />
  );
}
