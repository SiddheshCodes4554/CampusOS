-- SQL Migration: CampusOS Academic Brain Setup
-- Run this in your Supabase SQL Editor

-- 1. Create Document Category Enum
create type doc_category as enum ('syllabus', 'notes', 'assignment', 'ppt', 'pyq', 'study_material');

-- 2. Create Brain Documents Table
create table if not exists public.brain_documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  file_size integer not null,
  category doc_category not null,
  processed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable pgvector extension (must run as superuser)
create extension if not exists vector;

-- 4. Create Brain Chunks Table with Vector Support
create table if not exists public.brain_chunks (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.brain_documents(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  chunk_index integer not null,
  embedding vector(768) not null, -- Dimension 768 matching Gemini text-embedding-004
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create HNSW Vector Index for Cosine Similarity Optimization
create index if not exists brain_chunks_embedding_idx on public.brain_chunks 
using hnsw (embedding vector_cosine_ops);

-- 6. Create Knowledge Nodes Table (Graph Vertices)
create table if not exists public.knowledge_nodes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null, -- e.g., 'Concept', 'Equation', 'Event', 'Course'
  description text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, name, type)
);

-- 7. Create Knowledge Edges Table (Graph Edges)
create table if not exists public.knowledge_edges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  source_node_id uuid references public.knowledge_nodes(id) on delete cascade not null,
  target_node_id uuid references public.knowledge_nodes(id) on delete cascade not null,
  relation_type text not null, -- e.g., 'PREREQUISITE_OF', 'COVERS', 'EXAM_DATE_FOR'
  weight numeric(3,2) default 1.00 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, source_node_id, target_node_id, relation_type)
);

-- 8. Enable Row Level Security (RLS) on all tables
alter table public.brain_documents enable row level security;
alter table public.brain_chunks enable row level security;
alter table public.knowledge_nodes enable row level security;
alter table public.knowledge_edges enable row level security;

-- 9. Create RLS Policies for Access Control
create policy "Users can manage their own brain documents" 
  on public.brain_documents for all 
  using (auth.uid() = user_id);

create policy "Users can manage their own brain chunks" 
  on public.brain_chunks for all 
  using (auth.uid() = user_id);

create policy "Users can manage their own knowledge nodes" 
  on public.knowledge_nodes for all 
  using (auth.uid() = user_id);

create policy "Users can manage their own knowledge edges" 
  on public.knowledge_edges for all 
  using (auth.uid() = user_id);

-- 10. Create Similarity Match RPC Function
create or replace function public.match_brain_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  content text,
  file_name text,
  category public.doc_category,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    c.id,
    c.content,
    d.file_name,
    d.category,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.brain_chunks c
  join public.brain_documents d on c.document_id = d.id
  where c.user_id = p_user_id
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;
