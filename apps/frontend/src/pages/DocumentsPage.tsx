import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteDocument, fetchDocuments, retryDocument } from '@/api/documents';
import { queryKeys } from '@/api/queryKeys';
import { DocumentCard } from '@/components/DocumentCard';
import { DocumentRow } from '@/components/DocumentRow';
import { DocumentUpload } from '@/components/DocumentUpload';
import { Loading } from '@/components/Loading';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDocumentStatusUpdates } from '@/hooks/useDocumentStatusUpdates';

export function DocumentsPage() {
  useDocumentStatusUpdates();

  const queryClient = useQueryClient();
  const {
    data: documents,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.documents,
    queryFn: fetchDocuments,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.documents });

  const deleteMutation = useMutation({ mutationFn: deleteDocument, onSuccess: invalidate });
  const retryMutation = useMutation({ mutationFn: retryDocument, onSuccess: invalidate });

  const isRowBusy = (id: string) =>
    (deleteMutation.isPending && deleteMutation.variables === id) ||
    (retryMutation.isPending && retryMutation.variables === id);

  if (isPending) return <Loading />;
  if (error) return <div className="p-4 text-destructive">{error.message}</div>;

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-medium">Documents</h1>
        <DocumentUpload />
      </div>
      {documents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium">No documents yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a PDF, DOCX, TXT, or MD file to start asking questions about it.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5 md:hidden">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                isBusy={isRowBusy(doc.id)}
                onRetry={() => retryMutation.mutate(doc.id)}
                onDelete={() => deleteMutation.mutate(doc.id)}
              />
            ))}
          </div>
          <div className="hidden md:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-24">Size</TableHead>
                  <TableHead className="w-28">Uploaded</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    document={doc}
                    isBusy={isRowBusy(doc.id)}
                    onRetry={() => retryMutation.mutate(doc.id)}
                    onDelete={() => deleteMutation.mutate(doc.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
