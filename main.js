const express = require('express');
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const bodyParser = require('body-parser');

// Create an express app
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create a Redis connection and queue
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});
const taskQueue = new Queue('tasks', { connection: redisConnection });

if (process.env.PROCESSOR === 'true') {
  const worker = new Worker('tasks', async job => {
    console.log(`Processing job ${job.id}`);
    console.log(`Name: ${JSON.stringify(job.name)}`);
    console.log(`Data: ${JSON.stringify(job.data)}`);
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
  }, { connection: redisConnection, concurrency: 5 });

  worker.on('completed', job => {
    console.log(`Job ${job.id} completed!`);
  });

  worker.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed: ${err.message}`);
  });
} else {
  app.post('/task', async (req, res) => {
    const { name, data } = req.body;
    const job = await taskQueue.add(name, data);
    res.send({ jobId: job.id });
  });

  app.get('/task/:id', async (req, res) => {
    const job = await taskQueue.getJob(req.params.id);
    if (job) {
      res.send({ id: job.id, data: job.data, status: await job.getState() });
    } else {
      res.status(404).send({ error: 'Job not found' });
    }
  });

  // count all incomplete tasks in queue
  app.get('/tasks', async (req, res) => {
    const jobs = await taskQueue.getJobCounts();
    res.send(jobs);
  });
}

app.get('/', async (req, res) => {
  console.log('@@ PING: ', await redisConnection.ping());
  console.log('@@ Alive.');

  res.send('Alive');
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});