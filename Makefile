# Observer — one-command control for the benchmarking lab.
# Row count for seeding (override: `make seed ROWS=1000000`).
ROWS ?= 100000

.DEFAULT_GOAL := help
.PHONY: help start setup up down clean build migrate seed load-start load-stop logs-app ps restart-app

help: ## Show this help
	@grep -E '^[a-zA-Z_:-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-13s\033[0m %s\n", $$1, $$2}'

start: ## Start EVERYTHING in one command (stack + load generator)
	docker compose --profile load up -d --build

setup: ## First run: start stack, seed all engines, then start the load generator
	$(MAKE) up && $(MAKE) seed && $(MAKE) load-start

up: ## Build and start the stack (app + engines + observability, no load generator)
	docker compose up -d --build

down: ## Stop the stack and remove containers (keeps data volumes)
	docker compose down

clean: ## Stop the stack and delete all data volumes
	docker compose down -v

build: ## Rebuild the app image
	docker compose build

migrate: ## Run migrations on every SQL engine
	docker compose exec app node ace migration:run --connection=mysql --force
	docker compose exec app node ace migration:run --connection=mariadb --force
	docker compose exec app node ace migration:run --connection=postgres --force
	docker compose exec app node ace migration:run --connection=sqlite --force

seed: migrate ## Migrate then seed all engines (ROWS=1000000 make seed to scale up)
	docker compose exec app node ace bench:seed all --rows=$(ROWS)

load-start: ## Start the continuous load generator
	docker compose --profile load up -d --build loadgen

load-stop: ## Stop the load generator
	docker compose stop loadgen

restart-app: ## Restart just the app container (does not wait on DB dependencies)
	docker compose up -d --force-recreate --no-deps app

logs-app: ## Tail the app logs
	docker compose logs -f app

ps: ## Show container status
	docker compose ps
