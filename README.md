# Test task

## Running
Development mode
`docker-compose -f docker-compose.dev.yaml up`
Production mode
`docker-compose -f docker-compose.yaml up`

## Folder structure
* api-interface: first microservice with public API
* engine: second microservice with the processing engine
* build: docker-related files
* docker-compose.yaml: production compose definition
* docker-compose.dev.yaml: development mode compose definition
* postman_collection.json: Postman collection with REAST API requests
* swagger.yaml: Swagger API definition

## TODO:
* Interfaces should be moved to the shared lib - actually we have separate interface definitions for each microservice - sad, but...
* Request queue isn't implemented for now
* Winston should be tuned a little