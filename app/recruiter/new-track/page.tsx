import TrackBuilder from '@/src/screens/TrackBuilder'

export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams
  return <TrackBuilder editId={edit ?? null} />
}
