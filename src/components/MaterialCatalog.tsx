import React from 'react';
import { Search, Package, Wrench, Edit2, X, Save, RotateCcw, Plus, Trash2, FileUp } from 'lucide-react';
import { db } from '../db';
import { Material } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

interface CatalogProps {
  category: 'eletrico' | 'hidraulico';
}

export function MaterialCatalog({ category }: CatalogProps) {
  const [materials, setMaterials] = React.useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedMaterial, setSelectedMaterial] = React.useState<Material | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState<Material | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const refresh = () => {
      const all = db.getMaterials();
      const filteredByCategory = all.filter(m => {
        // Normalização robusta para o filtro de categoria
        const cat = m.category?.toLowerCase();
        if (category === 'eletrico') return cat === 'eletrico' || cat === 'elétrico';
        if (category === 'hidraulico') return cat === 'hidraulico' || cat === 'hidráulico';
        return false;
      });
      setMaterials(filteredByCategory);
    };
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [category]);

  const filtered = materials.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (material: Material) => {
    setSelectedMaterial(material);
    setEditForm(material);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editForm) {
      db.saveMaterial(editForm);
      setMaterials(db.getMaterials().filter(m => m.category === category));
      setIsEditing(false);
      setSelectedMaterial(null);
      setEditForm(null);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setSelectedMaterial(null);
    setEditForm(null);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const materialsToImport: Material[] = [];
        data.forEach((row) => {
          const name = row.Material || row.Nome || row.name;
          const price = parseFloat(row.Preço || row.Valor || row.price || 0);
          const unit = row.Unidade || row.unit || 'un';

          if (name) {
            materialsToImport.push({
              id: crypto.randomUUID(),
              name: name.toString(),
              category: category,
              price: isNaN(price) ? 0 : price,
              unit: unit.toString(),
            });
          }
        });

        if (materialsToImport.length > 0) {
          db.saveMaterialsBatch(materialsToImport);
          alert(`${materialsToImport.length} materiais importados com sucesso!`);
        }
      } catch (error) {
        console.error('Erro ao importar arquivo:', error);
        alert('Erro ao processar o arquivo. Verifique se o formato está correto.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">
            {category === 'eletrico' ? 'Materiais Elétricos' : 'Materiais Hidráulicos'}
          </h2>
          <p className="text-zinc-400">Catálogo de materiais e insumos.</p>
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
            title="Importar lista de materiais via Excel"
          >
            <FileUp size={18} />
            {isImporting ? 'Importando...' : 'Importar XLSX'}
          </button>
          <button
            onClick={() => {
              setEditForm({
                id: crypto.randomUUID(),
                name: '',
                category: category,
                price: 0,
                unit: 'un',
              });
              setIsEditing(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
          >
            <Plus size={18} />
            Novo Material
          </button>
          <div className={cn(
            "p-3 rounded-2xl",
            category === 'eletrico' ? "bg-red-600/10 text-red-500" : "bg-blue-600/10 text-blue-500"
          )}>
            {category === 'eletrico' ? <Package size={32} /> : <Wrench size={32} />}
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          placeholder="Buscar material..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all"
        />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase">Material</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase">Unidade</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase">Preço Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((material) => (
                <tr key={material.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm font-medium text-white">{material.name}</td>
                  <td className="px-6 py-4 text-sm text-zinc-400 capitalize">{material.unit}</td>
                  <td className="px-6 py-4 text-sm font-bold text-white">{formatCurrency(material.price)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(material)}
                      className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este material?')) {
                          db.deleteMaterial(material.id);
                          setMaterials(db.getMaterials().filter(m => m.category === category));
                        }
                      }}
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {selectedMaterial ? 'Editar Material' : 'Novo Material'}
                </h3>
                <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Nome do Material</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Unidade</label>
                    <input
                      type="text"
                      value={editForm.unit}
                      onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Preço</label>
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex justify-between items-center">
                <button
                  onClick={handleClose}
                  className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-bold"
                >
                  <RotateCcw size={18} />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  <Save size={18} />
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
