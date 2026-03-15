import React from 'react';
import { ClipboardList, Zap, Droplets, CheckCircle2, Plus, Edit2, Trash2, X, Save, FileUp, RotateCcw } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { db } from '../db';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

const defaultPackages = [
  {
    id: 'p1',
    name: 'Instalação de Ventilador',
    category: 'eletrico',
    price: 220.0,
    items: ['Mão de obra instalação', 'Fios e conectores', 'Suporte reforçado'],
    icon: Zap,
    color: 'text-red-500',
    bg: 'bg-red-500/10'
  },
  {
    id: 'p2',
    name: 'Iluminação Completa (Sala)',
    category: 'eletrico',
    price: 450.0,
    items: ['Instalação de até 4 spots', 'Fita LED em sanca', 'Interruptores novos'],
    icon: Zap,
    color: 'text-red-500',
    bg: 'bg-red-500/10'
  },
  {
    id: 'p3',
    name: 'Troca de Quadro Elétrico',
    category: 'eletrico',
    price: 850.0,
    items: ['Quadro novo até 12 disjuntores', 'Disjuntores inclusos', 'Identificação de circuitos'],
    icon: Zap,
    color: 'text-red-500',
    bg: 'bg-red-500/10'
  },
  {
    id: 'p4',
    name: 'Instalação de Banheiro',
    category: 'hidraulico',
    price: 650.0,
    items: ['Vaso sanitário', 'Pia e torneira', 'Chuveiro e registros'],
    icon: Droplets,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10'
  },
  {
    id: 'p5',
    name: 'Troca de Registros (Cozinha)',
    category: 'hidraulico',
    price: 180.0,
    items: ['Registro de gaveta', 'Registro de pressão', 'Vedações novas'],
    icon: Droplets,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10'
  },
  {
    id: 'p6',
    name: 'Manutenção Hidráulica Geral',
    category: 'hidraulico',
    price: 320.0,
    items: ['Revisão de vazamentos', 'Troca de reparos', 'Limpeza de ralos'],
    icon: Droplets,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10'
  },
];

export function Packages() {
  const [packages, setPackages] = React.useState<any[]>([]);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState<any | null>(null);
  const [newItemText, setNewItemText] = React.useState('');
  const [isImporting, setIsImporting] = React.useState(false);
  const [importStatus, setImportStatus] = React.useState<{ type: 'success' | 'error' | 'loading', message: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const refresh = () => {
    const loaded = db.getPackages();
    setPackages(loaded);
  };

  React.useEffect(() => {
    let loaded = db.getPackages();
    if (loaded.length === 0) {
      defaultPackages.forEach(p => db.savePackage(p));
      loaded = db.getPackages();
    }
    setPackages(loaded);

    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus({ type: 'loading', message: 'Lendo arquivo Excel...' });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        const workbook = XLSX.read(dataBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) throw new Error('O arquivo está vazio.');

        setImportStatus({ type: 'loading', message: `Processando ${jsonData.length} pacotes...` });

        const packagesToImport: any[] = [];
        jsonData.forEach((row) => {
          const keys = Object.keys(row);
          const findValue = (possibleNames: string[]) => {
            const key = keys.find(k => possibleNames.includes(k.toLowerCase().trim()));
            return key ? row[key] : null;
          };

          const name = findValue(['pacote', 'nome', 'descrição', 'descricao', 'name', 'package']);
          const priceStr = findValue(['preço', 'preco', 'valor', 'price', 'custo', 'total']);
          const category = findValue(['categoria', 'tipo', 'category', 'type']) || 'geral';
          const itemsStr = findValue(['itens', 'lista', 'items', 'serviços', 'servicos']);

          if (name) {
            const price = parseFloat(priceStr?.toString().replace(',', '.') || '0');
            const items = itemsStr ? itemsStr.toString().split(/[,;|\n]/).map((s: string) => s.trim()).filter(Boolean) : [];
            
            packagesToImport.push({
              id: crypto.randomUUID(),
              name: name.toString(),
              category: category.toString().toLowerCase().includes('elet') ? 'eletrico' : 
                        category.toString().toLowerCase().includes('hidr') ? 'hidraulico' : 'geral',
              price: isNaN(price) ? 0 : price,
              items: items,
            });
          }
        });

        if (packagesToImport.length > 0) {
          await db.savePackagesBatch(packagesToImport);
          setImportStatus({ 
            type: 'success', 
            message: `${packagesToImport.length} pacotes importados com sucesso!` 
          });
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          throw new Error('Nenhum pacote válido encontrado.');
        }
      } catch (error: any) {
        setImportStatus({ type: 'error', message: error.message || 'Erro ao processar arquivo.' });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSave = () => {
    if (editForm) {
      db.savePackage(editForm);
      setPackages(db.getPackages());
      setIsEditing(false);
      setEditForm(null);
    }
  };

  const addItemToForm = () => {
    if (newItemText.trim() && editForm) {
      setEditForm({ ...editForm, items: [...editForm.items, newItemText.trim()] });
      setNewItemText('');
    }
  };

  const removeItemFromForm = (index: number) => {
    if (editForm) {
      const newItems = [...editForm.items];
      newItems.splice(index, 1);
      setEditForm({ ...editForm, items: newItems });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este pacote?')) {
      db.deletePackage(id);
      setPackages(db.getPackages());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Pacotes de Serviços</h2>
          <p className="text-zinc-400">Soluções completas com preços fechados para facilitar a venda.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            title="Importar pacotes via Excel"
          >
            <FileUp size={18} />
            {isImporting ? 'Importando...' : 'Importar XLSX'}
          </button>
          <button
            onClick={() => {
              setEditForm({
                id: crypto.randomUUID(),
                name: '',
                category: 'eletrico',
                price: 0,
                items: [],
                color: 'text-red-500',
                bg: 'bg-red-500/10'
              });
              setIsEditing(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
          >
            <Plus size={18} />
            Novo Pacote
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col"
          >
            <div className="p-6 space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <div className={cn("p-2 rounded-lg", pkg.category === 'eletrico' ? 'bg-red-500/10' : 'bg-blue-500/10')}>
                  {pkg.category === 'eletrico' ? <Zap className="text-red-500" size={24} /> : <Droplets className="text-blue-500" size={24} />}
                </div>
                <span className="text-2xl font-black text-white">{formatCurrency(pkg.price)}</span>
              </div>

              <h3 className="text-xl font-bold text-white">{pkg.name}</h3>

              <ul className="space-y-2">
                {pkg.items && pkg.items.map((item: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex justify-between">
              <button
                onClick={() => {
                  setEditForm(pkg);
                  setIsEditing(true);
                }}
                className="text-zinc-400 hover:text-white transition-colors"
                title="Editar Pacote"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => handleDelete(pkg.id)}
                className="text-zinc-500 hover:text-red-500 transition-colors"
                title="Excluir Pacote"
              >
                <Trash2 size={18} />
              </button>
              <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-colors">
                Usar este Pacote
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isEditing && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {packages.some(p => p.id === editForm.id) ? 'Editar Pacote' : 'Novo Pacote'}
                </h3>
                <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Nome do Pacote</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Categoria</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                    >
                      <option value="eletrico">Elétrico</option>
                      <option value="hidraulico">Hidráulico</option>
                      <option value="geral">Geral</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Preço Fechado</label>
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Itens Inclusos (Lista)</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Adicionar item..."
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItemToForm(); } }}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                    />
                    <button type="button" onClick={addItemToForm} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">
                      <Plus size={18} />
                    </button>
                  </div>
                  <ul className="space-y-2 bg-zinc-950 border border-zinc-800 rounded-xl p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                    {editForm.items && editForm.items.length > 0 ? editForm.items.map((item: string, i: number) => (
                      <li key={i} className="flex items-center justify-between text-sm text-zinc-300 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg">
                        <span className="flex items-center gap-2 max-w-[85%]">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                          <span className="truncate">{item}</span>
                        </span>
                        <button onClick={() => removeItemFromForm(i)} className="text-zinc-500 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </li>
                    )) : (
                      <p className="text-xs text-zinc-500 italic text-center py-4">Nenhum item adicionado no pacote.</p>
                    )}
                  </ul>
                </div>
              </div>

              <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  <Save size={18} />
                  Salvar Pacote
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Popup de Status da Importação */}
      <AnimatePresence>
        {importStatus && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-[60]"
          >
            <div className={cn(
              "px-6 py-4 rounded-2xl border flex items-center gap-4 shadow-2xl backdrop-blur-md",
              importStatus.type === 'loading' ? "bg-zinc-900/90 border-zinc-700 text-white" :
              importStatus.type === 'success' ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-400" :
              "bg-red-950/90 border-red-500/50 text-red-400"
            )}>
              {importStatus.type === 'loading' && (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              {importStatus.type === 'success' && (
                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-emerald-950">
                  <Save size={12} />
                </div>
              )}
              {importStatus.type === 'error' && (
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-red-950">
                  <X size={12} />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider opacity-50">
                  {importStatus.type === 'loading' ? 'Importando' : 
                   importStatus.type === 'success' ? 'Sucesso' : 'Erro'}
                </span>
                <span className="text-sm font-medium">{importStatus.message}</span>
              </div>
              {importStatus.type !== 'loading' && (
                <button 
                  onClick={() => setImportStatus(null)}
                  className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
