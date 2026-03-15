-- Schema inicial para Supabase 
-- Database: postgres

-- Remove tabelas que possam ter sido criadas pela metade para evitar conflitos
DROP TABLE IF EXISTS configs CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS service_orders CASCADE;
DROP TABLE IF EXISTS budget_items CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Clients table
CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    document TEXT,
    address TEXT,
    city TEXT,
    observations TEXT,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials table
CREATE TABLE materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('eletrico', 'hidraulico')),
    price DECIMAL(10, 2) NOT NULL,
    unit TEXT,
    "order" INTEGER,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('eletrico', 'hidraulico')),
    base_price DECIMAL(10, 2) NOT NULL,
    suggested_materials JSONB DEFAULT '[]'::jsonb,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets table
CREATE TABLE budgets (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    labor_total DECIMAL(10, 2) DEFAULT 0,
    materials_total DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) DEFAULT 0,
    status TEXT CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')) DEFAULT 'pending',
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget Items table
CREATE TABLE budget_items (
    id TEXT PRIMARY KEY,
    budget_id TEXT REFERENCES budgets(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('service', 'material')),
    item_id TEXT,
    name TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service Orders table
CREATE TABLE service_orders (
    id TEXT PRIMARY KEY,
    budget_id TEXT REFERENCES budgets(id) ON DELETE RESTRICT,
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    client_name TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    technician_name TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')) DEFAULT 'pending',
    total DECIMAL(10, 2) DEFAULT 0,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Packages table
CREATE TABLE packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Config table
CREATE TABLE configs (
    id TEXT PRIMARY KEY,
    user_id TEXT, -- NULL for public config or general settings
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserção de Seed Data Inicial (Serviços) 
INSERT INTO services (id, name, category, base_price, suggested_materials)
VALUES 
    ('srv-1', 'Instalação de Tomada Simples', 'eletrico', 80.00, '[]'),
    ('srv-2', 'Troca de Disjuntor', 'eletrico', 120.00, '[]'),
    ('srv-3', 'Instalação de Chuveiro', 'eletrico', 150.00, '[]'),
    ('srv-4', 'Desentupimento de Pia', 'hidraulico', 180.00, '[]'),
    ('srv-5', 'Troca de Torneira', 'hidraulico', 90.00, '[]'),
    ('srv-6', 'Conserto de Vazamento Simples', 'hidraulico', 150.00, '[]')
ON CONFLICT DO NOTHING;

-- Inserção de Seed Data Inicial (Materiais)
INSERT INTO materials (id, name, category, price, unit)
VALUES
    ('mat-1', 'Cabo Flexível 2.5mm (metro)', 'eletrico', 2.50, 'm'),
    ('mat-2', 'Cabo Flexível 4.0mm (metro)', 'eletrico', 4.00, 'm'),
    ('mat-3', 'Cabo Flexível 6.0mm (metro)', 'eletrico', 6.00, 'm'),
    ('mat-4', 'Cabo Flexível 10.0mm (metro)', 'eletrico', 10.00, 'm'),
    ('mat-5', 'Disjuntor DIN 10A/16A/20A', 'eletrico', 15.00, 'un'),
    ('mat-6', 'Disjuntor DIN 25A/32A', 'eletrico', 18.00, 'un'),
    ('mat-7', 'Fita Isolante 20m', 'eletrico', 8.00, 'un'),
    ('mat-8', 'Tubo Soldável 25mm (barra 6m)', 'hidraulico', 45.00, 'un'),
    ('mat-9', 'Tubo Soldável 32mm (barra 6m)', 'hidraulico', 65.00, 'un'),
    ('mat-10', 'Tubo Esgoto 100mm (barra 6m)', 'hidraulico', 85.00, 'un'),
    ('mat-11', 'Registro de Gaveta 25mm', 'hidraulico', 45.00, 'un'),
    ('mat-12', 'Joelho 90º 25mm', 'hidraulico', 2.50, 'un'),
    ('mat-13', 'Tê 25mm', 'hidraulico', 3.50, 'un'),
    ('mat-14', 'Adesivo Plástico (Cola) 175g', 'hidraulico', 18.00, 'un'),
    ('mat-15', 'Sifão Universal Sanfonado', 'hidraulico', 15.00, 'un')
ON CONFLICT DO NOTHING;
