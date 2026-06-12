import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RENDER_API = 'https://project-one-187u.onrender.com';
const PUSH_SECRET = Deno.env.get('PUSH_SECRET') ?? '';

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const windowStart = new Date(now.getTime() - 2 * 60 * 1000);

    const { data: due, error } = await supabase
      .from('files_list')
      .select('id, file_name, folder_name, scheduled_at')
      .lte('scheduled_at', now.toISOString())
      .gte('scheduled_at', windowStart.toISOString());

    if (error) throw error;
    if (!due || due.length === 0) {
      return new Response(JSON.stringify({ ok: true, released: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const folders: Record<string, { count: number; folder: string }> = {};
    for (const row of due) {
      const key = row.folder_name || 'Root';
      if (!folders[key]) folders[key] = { count: 0, folder: key };
      folders[key].count++;
    }

    const ids = due.map((r: any) => r.id);
    await supabase.from('files_list').update({ scheduled_at: null }).in('id', ids);

    const pushResults: { folder: string; sent?: number; error?: string }[] = [];

    for (const { folder, count } of Object.values(folders)) {
      const folderLabel = folder === 'Root' ? '' : folder;
      const body = count === 1
        ? `New file available${folderLabel ? ' in ' + folderLabel : ''}. Tap to view.`
        : `${count} new files released${folderLabel ? ' in ' + folderLabel : ''}. Tap to view.`;

      try {
        const res = await fetch(`${RENDER_API}/api/push/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `📂 ${folderLabel || 'Files'} just dropped!`,
            body,
            url: '/index.html' + (folderLabel ? '?folder=' + encodeURIComponent(folderLabel) : ''),
            secret: PUSH_SECRET,
          }),
        });
        const result = await res.json();
        pushResults.push({ folder, sent: result.sent ?? 0 });
      } catch (pushErr) {
        pushResults.push({ folder, error: String(pushErr) });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, released: ids.length, folders: pushResults }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('release-scheduled-files error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});