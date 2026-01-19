
import React, { useState } from 'react';
import { Contact, ContactType, UserRole } from '../types';

interface ContactManagerProps {
  contacts: Contact[];
  onUpsert: (contact: Contact) => void;
  onDelete: (id: string) => void;
  userRole: UserRole;
}

const ContactManager: React.FC<ContactManagerProps> = ({ contacts, onUpsert, onDelete, userRole }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.PURCHASE || userRole === UserRole.SALES;

  // Filter contacts based on role
  const filteredContacts = contacts.filter(c => {
    if (userRole === UserRole.PURCHASE) return c.type === ContactType.SUPPLIER;
    if (userRole === UserRole.SALES) return c.type === ContactType.CUSTOMER;
    return true; // Admin sees all
  });

  const handleEdit = (c: Contact) => {
    setEditingContact(c);
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingContact(null);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Cari Kart Listesi</h2>
          <p className="text-xs text-gray-500">
            {userRole === UserRole.PURCHASE && 'Sadece Tedarikçi kayıtlarını görüyorsunuz.'}
            {userRole === UserRole.SALES && 'Sadece Müşteri kayıtlarını görüyorsunuz.'}
            {userRole === UserRole.ADMIN && 'Tüm cari kayıtları yönetiyorsunuz.'}
          </p>
        </div>
        <button onClick={handleNew} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition">
          + Yeni Cari Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map(c => (
          <div key={c.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${c.type === ContactType.CUSTOMER ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                {c.type}
              </span>
              <div className="flex space-x-1">
                <button onClick={() => handleEdit(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                <button onClick={() => onDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
              </div>
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-1">{c.name}</h3>
            <p className="text-sm text-gray-500 mb-2 font-medium">📞 {c.phone || '-'}</p>
            <p className="text-xs text-gray-400 mt-auto line-clamp-2 bg-gray-50 p-2 rounded-lg">📍 {c.address || '-'}</p>
          </div>
        ))}
        {filteredContacts.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100 text-gray-400 italic">
            Gösterilecek cari kayıt bulunamadı.
          </div>
        )}
      </div>

      {showModal && (
        <ContactModal 
          contact={editingContact} 
          onClose={() => setShowModal(false)} 
          onSave={onUpsert} 
          defaultType={userRole === UserRole.PURCHASE ? ContactType.SUPPLIER : ContactType.CUSTOMER}
        />
      )}
    </div>
  );
};

const ContactModal: React.FC<{ contact: Contact | null; onClose: () => void; onSave: (c: Contact) => void; defaultType: ContactType }> = ({ contact, onClose, onSave, defaultType }) => {
  const [formData, setFormData] = useState<Partial<Contact>>(contact || { name: '', type: defaultType, phone: '', address: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert('İsim zorunludur');
    onSave({ ...formData as Contact, id: formData.id || Math.random().toString(36).substring(7) });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-100 flex justify-between bg-gray-50/50">
            <h2 className="font-bold text-gray-800">{contact ? 'Cari Düzenle' : 'Yeni Cari Kaydı'}</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-bold uppercase">Cari Tipi</label>
              <select 
                className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as ContactType})}
              >
                <option value={ContactType.CUSTOMER}>Müşteri</option>
                <option value={ContactType.SUPPLIER}>Tedarikçi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-bold uppercase">İsim / Ünvan</label>
              <input className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Örn: Özlem Elektrik" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-bold uppercase">Telefon</label>
              <input className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="0xxx xxx xx xx" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-bold uppercase">Adres</label>
              <textarea className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" rows={3} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Tam adres bilgisi..." />
            </div>
          </div>
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">Vazgeç</button>
            <button type="submit" className="px-8 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition active:scale-95">Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactManager;
