.PHONY: up down update upgrade dump

up:
	docker compose up -d --remove-orphans

down:
	docker compose down

update:
	docker compose pull

upgrade: down update up

# Writes a Postgres dump to data/backups now. The service db-dump also writes
# one each night. Run it before a migration or other risky database work.
dump:
	docker compose exec db-dump sh /usr/local/bin/dump-database.sh
