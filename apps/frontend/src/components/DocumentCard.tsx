import { RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { Document } from '@/api/documents';
import { DeleteDocumentDialog } from '@/components/DeleteDocumentDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const statusVariant = {
  pending: 'secondary',
  processing: 'secondary',
  ready: 'default',
  failed: 'destructive',
} as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentCard({
  document,
  isBusy,
  onRetry,
  onDelete,
}: {
  document: Document;
  isBusy: boolean;
  onRetry: () => void;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm" title={document.filename}>
          {document.filename}
        </p>

        <div className="mt-1 flex min-w-0 items-center gap-2">
          <Badge variant={statusVariant[document.status]} title={document.error ?? undefined}>
            {document.status}
          </Badge>
          <p className="truncate text-xs text-muted-foreground">
            {formatBytes(document.sizeBytes)} · {new Date(document.createdAt).toLocaleDateString()}
          </p>
        </div>

        {document.status === 'failed' && document.error && (
          <p className="mt-1 text-xs text-destructive">{document.error}</p>
        )}
      </div>

      <div className="flex shrink-0 gap-1">
        {document.status === 'failed' && (
          <Button variant="ghost" size="icon-sm" aria-label="Retry" disabled={isBusy} onClick={onRetry}>
            <RotateCcw />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete"
          disabled={isBusy}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 />
        </Button>
      </div>

      <DeleteDocumentDialog
        filename={document.filename}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={onDelete}
      />
    </div>
  );
}
