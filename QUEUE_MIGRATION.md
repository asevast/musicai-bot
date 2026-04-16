# Queue Migration Note

## Breaking Change: Queue Names

BullMQ 5 does not support colons in queue names. The following queues were renamed:

| Old Name | New Name |
|----------|----------|
| synth:pro:urgent | synth-pro-urgent |
| synth:pro:normal | synth-pro-normal |
| synth:clip | synth-clip |
| synth:dlq | synth-dlq |
| notify | notify |

## Migration Steps

1. Clear old queues before deploying:
   docker compose exec redis redis-cli -a "Seor#26" FLUSHDB

2. Restart all services:
   docker compose restart

3. Existing jobs will be lost - inform users if any tracks were queued.

