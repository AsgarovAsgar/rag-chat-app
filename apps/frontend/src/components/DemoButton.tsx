import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { startDemo } from "@/api/auth";
import { queryKeys } from "@/api/queryKeys";
import { Button } from '@/components/ui/button'


export function DemoButton() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: startDemo,
    onSuccess: user => {
      queryClient.setQueryData(queryKeys.me, user)
      navigate('/', { replace: true })
    }
  })

  return (
    <div className="mt-6">
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-2 text-xs uppercase text-muted-foreground">
            or
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? 'Setting up…' : 'Try the demo'}
      </Button>
      {mutation.error && (
        <p className="mt-2 text-sm text-destructive">{mutation.error.message}</p>
      )}
    </div>
  )
}