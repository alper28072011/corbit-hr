import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/layout/PageHeader';
import { MessageSquare, Plus, Send, X, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { SupportTicket } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function FeedbackManagement() {
  const { currentUser, supportTickets, createSupportTicket, sendSupportMessage, closeSupportTicket } = useStore();
  
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  
  const [newTicket, setNewTicket] = useState({
    title: '',
    category: 'Soru',
    priority: 'Orta',
    message: ''
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [supportTickets, selectedTicketId]);

  if (!currentUser) return null;

  const selectedTicket = supportTickets.find(t => t.id === selectedTicketId);

  // Filter based on role? The query already limits if not super_admin.
  // For super_admin, we show all tickets.
  const displayTickets = [...supportTickets].sort((a, b) => b.updatedAt - a.updatedAt);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.title.trim() || !newTicket.message.trim()) return;

    await createSupportTicket({
      title: newTicket.title,
      category: newTicket.category as any,
      priority: newTicket.priority as any
    }, newTicket.message);

    setIsCreateModalOpen(false);
    setNewTicket({ title: '', category: 'Soru', priority: 'Orta', message: '' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !messageText.trim()) return;
    
    await sendSupportMessage(selectedTicketId, messageText);
    setMessageText('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Açık': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'İşlemde': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Cevaplandı': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Sonlandırıldı': return 'bg-stone-100 text-stone-800 border-stone-200';
      default: return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  return (
    <div className="w-full flex flex-col p-6 space-y-6 md:h-[calc(100vh-6rem)]">
      <PageHeader
        title="Destek & Geribildirim"
        description="Soru, şikayet ve geliştirme taleplerinizi iletebilirsiniz."
        actions={[
          {
            key: 'new_ticket',
            icon: Plus,
            tooltip: 'Yeni Destek Talebi Oluştur',
            onClick: () => setIsCreateModalOpen(true),
          }
        ]}
      />

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        
        {/* Left Column: Tickets List */}
        <div className="w-full md:w-1/3 flex flex-col card-standard overflow-hidden bg-white">
          <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center shrink-0">
            <h2 className="font-bold text-[#2D332D]">Taleplerim ({supportTickets.length})</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {displayTickets.length === 0 ? (
              <div className="text-center py-12 px-4 shadow-sm rounded-xl border border-dashed border-stone-200 text-stone-500">
                Kayıtlı talep bulunamadı.
              </div>
            ) : (
              displayTickets.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={cn(
                    "p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all",
                    selectedTicketId === ticket.id 
                      ? "bg-stone-50 border-[#7C8363] shadow-sm" 
                      : "bg-white border-stone-200 hover:border-stone-300"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-[#2D332D] text-sm line-clamp-1">{ticket.title}</h3>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ml-2", getStatusColor(ticket.status))}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 flex justify-between items-center">
                    <span className="bg-stone-100 px-2 py-0.5 rounded text-[10px] font-semibold">{ticket.category}</span>
                    <span className="font-mono text-[10px]">{new Date(ticket.updatedAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                  {currentUser.role === 'super_admin' && (
                    <div className="mt-2 text-[10px] text-stone-400 font-medium">Açan: {ticket.userName}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className="w-full md:w-2/3 flex flex-col card-standard overflow-hidden bg-white">
          {!selectedTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400 p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-stone-300" />
              </div>
              <p className="text-stone-500 font-medium max-w-sm">Lütfen bir konuşma seçin veya yeni bir talep başlatın.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="font-bold text-[#2D332D]">{selectedTicket.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-stone-500 font-medium">{selectedTicket.category}</span>
                    <span className="text-stone-300">•</span>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", getStatusColor(selectedTicket.status))}>
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>
                {selectedTicket.status !== 'Sonlandırıldı' && (
                  <button
                    onClick={() => closeSupportTicket(selectedTicket.id)}
                    className="text-xs font-bold text-stone-500 hover:text-red-600 bg-white border border-stone-200 hover:border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                  >
                    Görüşmeyi Sonlandır
                  </button>
                )}
              </div>

              {/* Chat Messages */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FDFCFB]">
                {selectedTicket.messages.map(msg => {
                  const isMe = msg.senderId === currentUser.id;
                  
                  return (
                    <div key={msg.id} className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                      <div 
                        className={cn(
                          "px-4 py-3 rounded-2xl shadow-sm text-sm",
                          isMe 
                            ? "bg-[#7C8363] text-white rounded-tr-sm" 
                            : "bg-white border border-stone-200 text-stone-800 rounded-tl-sm"
                        )}
                      >
                        {msg.message}
                      </div>
                      <div className={cn("flex items-center gap-2 mt-1 px-1", isMe ? "flex-row-reverse" : "flex-row")}>
                        <span className="text-[10px] font-bold text-stone-500">{msg.senderName}</span>
                        <span className="text-[10px] text-stone-400 capitalize px-1.5 py-0.5 bg-stone-100 rounded-full">{msg.senderRole.replace('_', ' ')}</span>
                        <span className="text-[10px] font-mono text-stone-400">{new Date(msg.timestamp).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input */}
              {selectedTicket.status === 'Sonlandırıldı' ? (
                <div className="p-4 bg-stone-50 border-t border-stone-100 text-center shrink-0">
                  <div className="inline-flex items-center gap-2 text-stone-500 font-medium text-sm bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-sm">
                    <AlertCircle className="w-4 h-4" />
                    Bu görüşme sonlandırılmıştır
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-stone-100 shrink-0">
                  <div className="flex items-end gap-3">
                    <textarea
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      placeholder="Mesajınızı yazın..."
                      className="flex-1 resize-none bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7C8363] focus:bg-white transition-colors"
                      rows={2}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      className="p-3 bg-[#7C8363] text-white rounded-xl hover:bg-[#6A7055] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#2D332D]">Yeni Talep Oluştur</h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Başlık</label>
                  <input
                    type="text"
                    required
                    value={newTicket.title}
                    onChange={e => setNewTicket({...newTicket, title: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]"
                    placeholder="Örn: X Hatası hk."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Kategori</label>
                    <select
                      value={newTicket.category}
                      onChange={e => setNewTicket({...newTicket, category: e.target.value})}
                      className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]"
                    >
                      <option value="Soru">Soru</option>
                      <option value="Hata Bildirimi (Bug)">Hata Bildirimi (Bug)</option>
                      <option value="Geliştirme Talebi">Geliştirme Talebi</option>
                      <option value="Görüş/Öneri">Görüş/Öneri</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Öncelik</label>
                    <select
                      value={newTicket.priority}
                      onChange={e => setNewTicket({...newTicket, priority: e.target.value})}
                      className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]"
                    >
                      <option value="Düşük">Düşük</option>
                      <option value="Orta">Orta</option>
                      <option value="Yüksek">Yüksek</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Mesajınız</label>
                  <textarea
                    required
                    rows={4}
                    value={newTicket.message}
                    onChange={e => setNewTicket({...newTicket, message: e.target.value})}
                    className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] resize-none"
                    placeholder="Detaylı bir şekilde açıklayın..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-6 py-2 text-sm font-bold text-stone-500 hover:text-stone-700 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-sm font-bold bg-[#7C8363] text-white rounded-xl hover:bg-[#6A7055] transition-colors shadow-sm"
                  >
                    Talebi Başlat
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
