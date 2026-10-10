import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE users (
      id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name          VARCHAR(100) NOT NULL,
      email         VARCHAR(255) NOT NULL,
      password_hash VARCHAR(100) NOT NULL,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));

    CREATE TABLE refresh_tokens (
      id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  CHAR(64)    NOT NULL UNIQUE,
      expires_at  TIMESTAMPTZ NOT NULL,
      user_agent  VARCHAR(255),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

    CREATE TABLE categories (
      id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       VARCHAR(50) NOT NULL,
      color      VARCHAR(7)  NOT NULL DEFAULT '#64748b',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX categories_user_name_uq ON categories (user_id, lower(name));

    CREATE TABLE expenses (
      id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id     BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id BIGINT        NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      description VARCHAR(255)  NOT NULL DEFAULT '',
      spent_on    DATE          NOT NULL,
      created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
    );
    CREATE INDEX expenses_user_date_idx ON expenses (user_id, spent_on DESC, id DESC);
    CREATE INDEX expenses_user_category_date_idx ON expenses (user_id, category_id, spent_on);
    CREATE INDEX expenses_category_idx ON expenses (category_id);

    CREATE TABLE budgets (
      id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id     BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id BIGINT        NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      month       DATE          NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
      amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
      CONSTRAINT budgets_user_category_month_uq UNIQUE (user_id, category_id, month)
    );
    CREATE INDEX budgets_user_month_idx ON budgets (user_id, month);
    CREATE INDEX budgets_category_idx ON budgets (category_id);
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION fn_category_summary(p_user_id BIGINT, p_from DATE, p_to DATE)
    RETURNS TABLE (
      category_id   BIGINT,
      name          VARCHAR,
      color         VARCHAR,
      spent         NUMERIC,
      budget        NUMERIC,
      expense_count BIGINT
    )
    LANGUAGE sql STABLE AS $$
      SELECT c.id,
             c.name,
             c.color,
             COALESCE(e.spent, 0)  AS spent,
             COALESCE(b.budget, 0) AS budget,
             COALESCE(e.cnt, 0)    AS expense_count
      FROM categories c
      LEFT JOIN (
        SELECT x.category_id, SUM(x.amount) AS spent, COUNT(*) AS cnt
        FROM expenses x
        WHERE x.user_id = p_user_id AND x.spent_on BETWEEN p_from AND p_to
        GROUP BY x.category_id
      ) e ON e.category_id = c.id
      LEFT JOIN (
        SELECT y.category_id, SUM(y.amount) AS budget
        FROM budgets y
        WHERE y.user_id = p_user_id
          AND y.month BETWEEN date_trunc('month', p_from)::date AND p_to
        GROUP BY y.category_id
      ) b ON b.category_id = c.id
      WHERE c.user_id = p_user_id
      ORDER BY 4 DESC, c.name;
    $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP FUNCTION IF EXISTS fn_category_summary(BIGINT, DATE, DATE);
    DROP TABLE IF EXISTS budgets;
    DROP TABLE IF EXISTS expenses;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS refresh_tokens;
    DROP TABLE IF EXISTS users;
  `);
}
