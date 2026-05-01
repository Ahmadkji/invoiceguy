-- Fix FK constraints: add ON DELETE CASCADE for client and project references.
-- This enables future delete features. Without cascade, deleting a client
-- would fail because projects, invoices, and time_entries still reference it.
--
-- Existing pattern: user_id FKs already use ON DELETE CASCADE (line 3,17,50,83).

-- projects.client_id -> clients(id)
ALTER TABLE public.projects
  DROP CONSTRAINT projects_client_id_fkey,
  ADD CONSTRAINT projects_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- invoices.client_id -> clients(id)
ALTER TABLE public.invoices
  DROP CONSTRAINT invoices_client_id_fkey,
  ADD CONSTRAINT invoices_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- time_entries.client_id -> clients(id)
ALTER TABLE public.time_entries
  DROP CONSTRAINT time_entries_client_id_fkey,
  ADD CONSTRAINT time_entries_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- time_entries.project_id -> projects(id)
ALTER TABLE public.time_entries
  DROP CONSTRAINT time_entries_project_id_fkey,
  ADD CONSTRAINT time_entries_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
