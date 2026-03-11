import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const SECRET = 'hidra-super-secret-key';

app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'banco_dados_clientes');
const SYSTEM_PATH = path.join(__dirname, 'sistema');
const ADMIN_CREDENTIALS = { user: 'admin', pass: '2486' };

// Garantir que a pasta principal do banco de dados existe
await fs.ensureDir(DB_PATH);

// --- UTILITÁRIOS ---

const getClientPath = (username) => path.join(DB_PATH, username);

const saveJson = async (filePath, data) => {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJson(filePath, data, { spaces: 2 });
};

const readJson = async (filePath) => {
    if (await fs.pathExists(filePath)) {
        return await fs.readJson(filePath);
    }
    return null;
};

// --- ROTAS DE AUTENTICAÇÃO ---

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // Login Admin
    if (username === ADMIN_CREDENTIALS.user && password === ADMIN_CREDENTIALS.pass) {
        const token = jwt.sign({ username, role: 'admin' }, SECRET);
        return res.json({ token, role: 'admin' });
    }

    // Login Cliente
    const clientData = await readJson(path.join(getClientPath(username), 'dados.json'));
    if (clientData && password === clientData.password) {
        const token = jwt.sign({ username, role: 'client' }, SECRET);
        return res.json({ token, role: 'client', client: clientData });
    }

    res.status(401).json({ message: 'Credenciais inválidas' });
});

// --- ROTAS ADMIN ---

// Criar Cliente
app.post('/api/admin/clients', async (req, res) => {
    const { name, username, password, planId } = req.body;
    const clientDir = getClientPath(username);

    if (await fs.pathExists(clientDir)) {
        return res.status(400).json({ message: 'Usuário já existe' });
    }

    const creationDate = new Date().toISOString();

    // 1. Criar pasta do cliente
    await fs.ensureDir(clientDir);

    // 2. Criar banco de dados individual
    await saveJson(path.join(clientDir, 'dados.json'), {
        name, username, password, createdAt: creationDate, status: 'active'
    });

    // 3. Registrar plano inicial
    await saveJson(path.join(clientDir, 'assinatura.json'), {
        planId, startDate: creationDate, status: 'active'
    });

    // 4. Inicializar histórico de pagamentos
    await saveJson(path.join(clientDir, 'pagamentos.json'), []);

    res.json({ message: 'Cliente criado com sucesso', username });
});

// Listar Clientes
app.get('/api/admin/clients', async (req, res) => {
    const folders = await fs.readdir(DB_PATH);
    const clients = [];

    for (const folder of folders) {
        const data = await readJson(path.join(DB_PATH, folder, 'dados.json'));
        if (data) clients.push(data);
    }
    res.json(clients);
});

// --- INICIALIZAÇÃO ---

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
