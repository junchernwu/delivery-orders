## Running the app

```bash
# 1. First, update the .env file for GOOGLE_MAPS_API_KEY field
$ docker-compose up --build

```

## Test

```bash
# unit tests
# 1. First, update the .env file for GOOGLE_MAPS_API_KEY field
# 2. instantiate test db
$ docker-compose up --build 
$ npm run test

# Integration test
$ npm run test:e2e

```

## Implementation Details
1. Concurrent updates to take delivery order 
   1. Use transactions to ensure atomicity
   2. Acquire row locks to check if order is in database and whether status is unassigned
   3. If yes, update the table, release lock and commit
   4. If no, throw error, release lock and rollback transaction

2. Table (DeliveryOrders) schema

      | DeliveryOrders fields | 
      |-----------------------|
      | orderID (uuid)(P KEY) | 
      | status                | 
      | distance              | 
      | dateTimeField (S KEY) |
   1. Added a new **`dateTimeField`** to use **keyset pagination**. Since each new deliveryOrder will be created at a different dateTime, when querying by limit and page, sorting by dateTimeField will ensure there will not be new deliveryOrder that messes up the order of the pagination. 
   2. Added an index on dateTimeField to improve performance of sorting for keyset pagination
   3. Keyset pagination is more efficient than offset pagination once datasets get larger, avoiding the need to scan through and skip rows