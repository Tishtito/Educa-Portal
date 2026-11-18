import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, requestBlob, requestPage } from '@/lib/api/client'
import type { MaterialSummary, TeachingMaterial } from '@/lib/api/types'
import { openBlob, saveBlob } from '@/lib/download'

export interface MaterialFilters {
  level_id?: number
  grade_id?: number
  q?: string
}

export const materialKeys = {
  list: (filters: MaterialFilters) => ['materials', 'list', filters] as const,
  summary: ['materials', 'summary'] as const,
}

/** With no section or grade, the API returns the teacher's own grades. */
export function useMyMaterials(filters: MaterialFilters, enabled = true) {
  return useQuery({
    queryKey: materialKeys.list(filters),
    queryFn: ({ signal }) => requestPage<TeachingMaterial>('/my/teaching-materials', { query: { ...filters, per_page: 200 }, signal }),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useMaterialSummary(enabled = true) {
  return useQuery({
    queryKey: materialKeys.summary,
    queryFn: ({ signal }) => api.get<MaterialSummary>('/my/teaching-materials/summary', { signal }),
    staleTime: 60_000,
    enabled,
  })
}

/** PDFs and images open (a tab on the web, the share sheet on phones); Office files are saved. */
export async function openMaterial(material: TeachingMaterial): Promise<void> {
  const { blob, filename } = await requestBlob(`/my/teaching-materials/${material.id}/download`)
  const name = filename ?? `${material.title}.${material.extension}`
  await (['pdf', 'jpg', 'jpeg', 'png'].includes(material.extension) ? openBlob(blob, name) : saveBlob(blob, name))
}
