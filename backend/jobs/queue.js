const path = require('path');
const fs = require('fs');
const { createPlaceholderGlb } = require('./glbGenerator');

const jobs = new Map();
const STATIC_AVATARS = path.join(__dirname, '..', 'static', 'avatars');

function createJob(id, data) {
  const job = {
    id,
    status: 'queued',
    progress: 0,
    avatarUrl: null,
    error: null,
    ...data,
  };
  jobs.set(id, job);
  return job;
}

function getJob(id) {
  return jobs.get(id);
}

function updateJob(id, updates) {
  const job = jobs.get(id);
  if (job) Object.assign(job, updates);
  return job;
}

async function processOneJob(job) {
  if (job.status !== 'queued') return;
  updateJob(job.id, { status: 'processing', progress: 10 });

  try {
    const outputPath = path.join(STATIC_AVATARS, `${job.id}.glb`);
    const glbDir = path.dirname(outputPath);
    if (!fs.existsSync(glbDir)) fs.mkdirSync(glbDir, { recursive: true });

    updateJob(job.id, { progress: 50 });

    createPlaceholderGlb(outputPath);

    updateJob(job.id, {
      status: 'done',
      progress: 100,
      avatarUrl: `/static/avatars/${job.id}.glb`,
    });
  } catch (err) {
    console.error('[processJob]', err);
    updateJob(job.id, {
      status: 'failed',
      error: err.message || 'Avatar generation failed',
    });
  }
}

let processing = false;

async function processJobs() {
  if (processing) return;
  const pending = [...jobs.values()].find((j) => j.status === 'queued');
  if (!pending) return;

  processing = true;
  try {
    await processOneJob(pending);
  } finally {
    processing = false;
    const next = [...jobs.values()].find((j) => j.status === 'queued');
    if (next) processJobs();
  }
}

module.exports = { createJob, getJob, updateJob, processJobs };
