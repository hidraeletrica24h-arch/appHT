import React from 'react';
import { Search, Zap, Droplets, X, Package, Edit2, Save, RotateCcw, Plus, Trash2, FileUp } from 'lucide-react';
import { db } from '../db';
import { Service, Material } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

interface CatalogProps {
  category: 'eletrico' | 'hidraulico';
}

export function ServiceCatalog({ category }: CatalogProps) {
  const [services, setServices] = React.useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedService, setSelectedService] = React.useState<Service | null>(null);
  const [allMaterials, setAllMaterials] = React.useState<Material[]>([]);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState<Service | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importStatus, setImportStatus] = React.useState<{ type: 'success' | 'error' | 'loading', message: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const refresh = () => {
      const all = db.getServices();
      const filteredByCategory = all.filter(s => {
        const cat = s.category?.toLowerCase();
        if (category === 'eletrico') return cat === 'eletrico' || cat === 'elétrico';
        if (category === 'hidraulico') return cat === 'hidraulico' || cat === 'hidráulico';
        return false;
      });
      setServices(filteredByCategory);
    };
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [category]);

  React.useEffect(() => {
    setAllMaterials(db.getMaterials());
  }, []);

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMaterialDetails = (mId: string) => {
    return allMaterials.find(m => m.id === mId);
  };

  const handleEdit = () => {
    setEditForm(selectedService);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editForm) {
      db.saveService(editForm);
      setServices(db.getServices().filter(s => s.category === category));
      setSelectedService(editForm);
      setIsEditing(false);
    }
  };

  const handleClose = () => {
    setSelectedService(null);
    setIsEditing(false);
    setEditForm(null);
  };

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

        setImportStatus({ type: 'loading', message: `Processando ${jsonData.length} serviços...` });

        const servicesToImport: Service[] = [];
        jsonData.forEach((row) => {
          const keys = Object.keys(row);
          const findValue = (possibleNames: string[]) => {
            const key = keys.find(k => possibleNames.includes(k.toLowerCase().trim()));
            return key ? row[key] : null;
          };

          const name = findValue(['serviço', 'servico', 'nome', 'descrição', 'descricao', 'name', 'service']);
          const priceStr = findValue(['preço', 'preco', 'valor', 'price', 'custo', 'unitário', 'unitario', 'base']);

          if (name) {
            const price = parseFloat(priceStr?.toString().replace(',', '.') || '0');
            servicesToImport.push({
              id: crypto.randomUUID(),
              name: name.toString(),
              category: category,
              basePrice: isNaN(price) ? 0 : price,
              suggestedMaterials: [],
            });
          }
        });

        if (servicesToImport.length > 0) {
          await db.saveServicesBatch(servicesToImport);
          setImportStatus({ 
            type: 'success', 
            message: `${servicesToImport.length} serviços importados com sucesso!` 
          });
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          throw new Error('Nenhum serviço válido encontrado.');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">
            {category === 'eletrico' ? 'Serviços Elétricos' : 'Serviços Hidráulicos'}
          </h2>
          <p className="text-zinc-400">Catálogo de serviços com valores médios (Porto Alegre).</p>
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
            title="Importar serviços via Excel"
          >
            <FileUp size={18} />
            {isImporting ? 'Importando...' : 'Importar XLSX'}
          </button>
          <button
            onClick={() => {
              const newService: Service = {
                id: crypto.randomUUID(),
                name: '',
                category: category,
                basePrice: 0,
                suggestedMaterials: [],
              };
              setSelectedService(newService);
              setEditForm(newService);
              setIsEditing(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
          >
            <Plus size={18} />
            Novo Serviço
          </button>
          <div className={cn(
            "p-3 rounded-2xl",
            category === 'eletrico' ? "bg-red-600/10 text-red-500" : "bg-blue-600/10 text-blue-500"
          )}>
            {category === 'eletrico' ? <Zap size={32} /> : <Droplets size={32} />}
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          placeholder="Buscar serviço..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((service) => (
          <div key={service.id} className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-bold text-white group-hover:text-red-500 transition-colors">{service.name}</h4>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Valor Base</p>
                <p className="text-xl font-black text-white">{formatCurrency(service.basePrice)}</p>
              </div>
              <button
                onClick={() => setSelectedService(service)}
                className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
              >
                Ver Detalhes
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {isEditing ? (editForm?.id === selectedService?.id && selectedService?.name ? 'Editar Serviço' : 'Novo Serviço') : 'Detalhes do Serviço'}
                </h3>
                <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {isEditing && editForm ? (
                  <>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Nome do Serviço</label>
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
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                        >
                          <option value="eletrico">Elétrico</option>
                          <option value="hidraulico">Hidráulico</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Preço Sugerido</label>
                        <input
                          type="number"
                          value={editForm.basePrice}
                          onChange={(e) => setEditForm({ ...editForm, basePrice: Number(e.target.value) })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome do Serviço</p>
                      <p className="text-lg font-bold text-white">{selectedService.name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Categoria</p>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          selectedService.category === 'eletrico' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                        )}>
                          {selectedService.category === 'eletrico' ? 'Elétrico' : 'Hidráulico'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Preço Sugerido</p>
                        <p className="text-xl font-black text-white">{formatCurrency(selectedService.basePrice)}</p>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Materiais Sugeridos</p>
                  <div className="space-y-2">
                    {selectedService.suggestedMaterials.length > 0 ? (
                      selectedService.suggestedMaterials.map(mId => {
                        const mat = getMaterialDetails(mId);
                        return mat ? (
                          <div key={mId} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                            <div className="flex items-center gap-3">
                              <Package size={16} className="text-zinc-500" />
                              <span className="text-sm text-zinc-300">{mat.name}</span>
                            </div>
                            <span className="text-xs font-bold text-zinc-500">{formatCurrency(mat.price)}</span>
                          </div>
                        ) : null;
                      })
                    ) : (
                      <p className="text-sm text-zinc-500 italic">Nenhum material sugerido para este serviço.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex justify-between items-center">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
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
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-colors"
                    >
                      <Edit2 size={18} />
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este serviço?')) {
                          db.deleteService(selectedService.id);
                          handleClose();
                          setServices(db.getServices().filter(s => s.category === category));
                        }
                      }}
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Excluir Serviço"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-colors"
                    >
                      Fechar
                    </button>
                  </>
                )}
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
