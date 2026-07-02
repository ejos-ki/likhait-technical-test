-- Database and application user are created via the MYSQL_* environment variables
-- in docker-compose.yml. Schema and seed data are managed by Rails (single source of truth).
--
-- Rails' schema tasks (db:schema:load / db:prepare) iterate over ALL databases declared
-- in config/database.yml, including the `test` database. The MYSQL_* env vars only create
-- and grant access to the development database, so those tasks fail with "access denied"
-- on expense_system_test. We create the test database and grant the app user access here
-- so Rails can prepare both databases (and so the RSpec suite has a database to run against).

CREATE DATABASE IF NOT EXISTS expense_system_test
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON expense_system_test.* TO 'expense_user'@'%';
FLUSH PRIVILEGES;