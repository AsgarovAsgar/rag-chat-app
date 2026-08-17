import { RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { Document } from '@/api/documents';
import { DeleteDocumentDialog } from '@/components/DeleteDocumentDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';

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

export function DocumentRow({
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
    <TableRow>
      <TableCell className="truncate">{document.filename}</TableCell>
      <TableCell>
        <Badge variant={statusVariant[document.status]} title={document.error ?? undefined}>
          {document.status}
        </Badge>
      </TableCell>
      <TableCell>{formatBytes(document.sizeBytes)}</TableCell>
      <TableCell>{new Date(document.createdAt).toLocaleDateString()}</TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          {document.status === 'failed' && (
            <Button variant="ghost" size="icon" aria-label="Retry" disabled={isBusy} onClick={onRetry}>
              <RotateCcw />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
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
      </TableCell>
    </TableRow>
  );
}
