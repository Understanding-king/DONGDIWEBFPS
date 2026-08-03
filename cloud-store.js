import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_PUBLISHABLE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
const configured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
const client = configured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }
    })
  : null;

function failIfError(result, context) {
  if (result && result.error) throw new Error(context + '：' + result.error.message);
  return result ? result.data : null;
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : null;
}

function validTimestamp(value) {
  var parsed = new Date(value || Date.now());
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

function recordToRow(record) {
  return {
    id:String(record.id),
    title:String(record.title || ''),
    category:String(record.category || ''),
    occurred_on:validDate(record.date),
    description:String(record.description || ''),
    ai_description:String(record.aiDescription || ''),
    keywords:Array.isArray(record.keywords) ? record.keywords.map(String) : [],
    uncertainties:Array.isArray(record.uncertainties) ? record.uncertainties.map(String) : [],
    files:Array.isArray(record.files) ? record.files : [],
    photos:Array.isArray(record.photos) ? record.photos : [],
    needs_date:Boolean(record.needsDate),
    created_via:record.createdVia ? String(record.createdVia) : null,
    created_at:validTimestamp(record.createdAt)
  };
}

function noteToRow(note) {
  return {
    id:String(note.id),
    content:String(note.content || '').trim(),
    note_date:validDate(note.date),
    created_at:validTimestamp(note.createdAt)
  };
}

function rowToRecord(row) {
  return {
    id:row.id,
    title:row.title || '',
    category:row.category || '',
    date:row.occurred_on || '',
    description:row.description || '',
    aiDescription:row.ai_description || '',
    keywords:Array.isArray(row.keywords) ? row.keywords : [],
    uncertainties:Array.isArray(row.uncertainties) ? row.uncertainties : [],
    files:Array.isArray(row.files) ? row.files : [],
    photos:Array.isArray(row.photos) ? row.photos : [],
    createdAt:row.created_at,
    needsDate:Boolean(row.needs_date),
    ...(row.created_via ? { createdVia:row.created_via } : {})
  };
}

function rowToNote(row) {
  return { id:row.id, content:row.content, date:row.note_date || '', createdAt:row.created_at };
}

export function isCloudConfigured() { return configured; }

export async function readCloudArchive() {
  if (!configured) throw new Error('尚未配置 Supabase');
  var results = await Promise.all([
    client.from('records').select('*').order('created_at', { ascending:false }),
    client.from('notes').select('*').order('created_at', { ascending:false }),
    client.from('categories').select('name').order('created_at', { ascending:true })
  ]);
  var records = failIfError(results[0], '读取云端事件失败') || [];
  var notes = failIfError(results[1], '读取云端随手记失败') || [];
  var categories = failIfError(results[2], '读取云端分类失败') || [];
  return {
    records:records.map(rowToRecord),
    notes:notes.map(rowToNote),
    categories:categories.map(function (row) { return row.name; })
  };
}

export async function readCloudMigrationState() {
  if (!configured) throw new Error('尚未配置 Supabase');
  var data = failIfError(await client.from('archive_meta').select('value').eq('key', 'initial_archive_import').maybeSingle(), '读取云端迁移状态失败');
  return data ? data.value : null;
}

export async function markCloudMigrationComplete(value) {
  if (!configured) throw new Error('尚未配置 Supabase');
  failIfError(await client.from('archive_meta').upsert({ key:'initial_archive_import', value:value || {} }, { onConflict:'key' }), '保存云端迁移状态失败');
}

async function upsertCollection(collection, items) {
  if (!items.length) return;
  var rows = collection === 'records'
    ? items.map(recordToRow)
    : items.map(noteToRow);
  failIfError(await client.from(collection).upsert(rows, { onConflict:'id' }), '写入云端' + (collection === 'records' ? '事件' : '随手记') + '失败');
}

export async function applyCloudCollectionPatch(collection, patch) {
  if (!configured) throw new Error('尚未配置 Supabase');
  var upsert = patch && Array.isArray(patch.upsert) ? patch.upsert : [];
  var deleteIds = patch && Array.isArray(patch.deleteIds) ? patch.deleteIds.map(String) : [];
  await upsertCollection(collection, upsert);
  if (deleteIds.length) {
    failIfError(await client.from(collection).delete().in('id', deleteIds), '删除云端数据失败');
  }
}

export async function upsertCloudCategories(names) {
  if (!configured) throw new Error('尚未配置 Supabase');
  var uniqueNames = Array.from(new Set((names || []).map(function (name) { return String(name).trim(); }).filter(Boolean)));
  if (!uniqueNames.length) return;
  var rows = uniqueNames.map(function (name) { return { name:name }; });
  failIfError(await client.from('categories').upsert(rows, { onConflict:'name', ignoreDuplicates:true }), '写入云端分类失败');
}

export async function migrateArchiveToCloud(archive, categoryNames) {
  if (!configured) throw new Error('尚未配置 Supabase');
  var records = archive && Array.isArray(archive.records) ? archive.records.filter(function (item) { return item && item.id; }) : [];
  var notes = archive && Array.isArray(archive.notes) ? archive.notes.filter(function (item) { return item && item.id && String(item.content || '').trim(); }) : [];
  await upsertCollection('records', records);
  await upsertCollection('notes', notes);
  await upsertCloudCategories(categoryNames);
  return readCloudArchive();
}
