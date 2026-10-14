import React, { useState, useEffect, useRef } from 'react';
import { EcomSettings, CategoryItem, SubCategoryItem } from '../types';
import { dbService } from '../lib/dbService';
import { compressImage } from '../lib/imageUtils';
import { CircularProgress } from './LoadingSkeleton';
import { 
  Tag, Plus, Trash2, Save, RefreshCw, Check, GripVertical, ChevronDown, ChevronRight, Edit3, X, ArrowUp, ArrowDown, FolderPlus,
  Upload, Image as ImageIcon
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';

export default function CategoryManager() {
  const [settings, setSettings] = useState<EcomSettings>({
    deliveryChargeInsideDhaka: 60,
    deliveryChargeOutsideDhaka: 110,
    categories: [],
    categoryItems: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Category Inputs
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [isUploadingNewCat, setIsUploadingNewCat] = useState(false);

  // Category Editing
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatImage, setEditingCatImage] = useState('');
  const [isUploadingEditCat, setIsUploadingEditCat] = useState(false);

  // Subcategory Inputs
  const [activeAddingSubCatId, setActiveAddingSubCatId] = useState<string | null>(null);
  const [newSubCatName, setNewSubCatName] = useState('');
  const [newSubCatImage, setNewSubCatImage] = useState('');
  const [isUploadingNewSubCat, setIsUploadingNewSubCat] = useState(false);

  // Subcategory Editing
  const [editingSubCatKey, setEditingSubCatKey] = useState<string | null>(null); // "catId-subId"
  const [editingSubCatName, setEditingSubCatName] = useState('');
  const [editingSubCatImage, setEditingSubCatImage] = useState('');
  const [isUploadingEditSubCat, setIsUploadingEditSubCat] = useState(false);

  // Expanded categories state
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // Drag and Drop State
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
  const [draggedSubCatInfo, setDraggedSubCatInfo] = useState<{ catId: string; subIdx: number } | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#0f766e');

  // Hidden File Inputs
  const newCatFileRef = useRef<HTMLInputElement>(null);
  const editCatFileRef = useRef<HTMLInputElement>(null);
  const newSubCatFileRef = useRef<HTMLInputElement>(null);
  const editSubCatFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await dbService.getEcomSettings();
        if (data.primaryColor) {
          setPrimaryColor(data.primaryColor);
        }
        let catItems: CategoryItem[] = data.categoryItems || [];

        // If categoryItems is empty but categories string array exists, construct categoryItems
        if ((!catItems || catItems.length === 0) && data.categories && data.categories.length > 0) {
          catItems = data.categories.map((c, idx) => ({
            id: `cat-${Date.now()}-${idx}`,
            name: c,
            order: idx,
            subcategories: []
          }));
        }

        setSettings({
          ...data,
          categories: data.categories || [],
          categoryItems: catItems
        });

        // Default expand all
        const initialExpand: Record<string, boolean> = {};
        catItems.forEach(c => { initialExpand[c.id] = true; });
        setExpandedCats(initialExpand);

      } catch (err) {
        console.error('Error loading category settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleImageCompress = async (
    file: File,
    setImage: (url: string) => void,
    setLoading: (val: boolean) => void
  ) => {
    setLoading(true);
    try {
      const compressed = await compressImage(file, 600, 0.85, 300000);
      setImage(compressed);
    } catch (err) {
      console.error('Failed to compress image:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setLoading(false);
    }
  };

  const persistCategories = async (updatedItems: CategoryItem[]) => {
    try {
      const currentFullSettings = await dbService.getEcomSettings();
      const updatedCategoriesList = updatedItems.map(c => c.name);

      await dbService.saveEcomSettings({
        ...currentFullSettings,
        categories: updatedCategoriesList,
        categoryItems: updatedItems
      });
    } catch (err) {
      console.error('Error saving categories:', err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await persistCategories(settings.categoryItems || []);
      setSaveSuccess(true);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Save was successful!',
        message: 'Categories and sub-categories have been successfully saved to the database.'
      });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving categories:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'There was an error saving',
        message: 'There was a problem saving the category. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add Main Category
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const name = newCatName.trim();

    const exists = settings.categoryItems?.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setFeedback({
        isOpen: true,
        type: 'info',
        title: 'Already connected',
        message: `"${name}" categoryT Already on your list।`
      });
      return;
    }

    const newCat: CategoryItem = {
      id: `cat-${Date.now()}`,
      name,
      image: newCatImage.trim() || undefined,
      order: (settings.categoryItems?.length || 0),
      subcategories: []
    };

    const updatedItems = [...(settings.categoryItems || []), newCat];
    setSettings(prev => ({
      ...prev,
      categoryItems: updatedItems
    }));

    persistCategories(updatedItems);
    setExpandedCats(prev => ({ ...prev, [newCat.id]: true }));
    setNewCatName('');
    setNewCatImage('');
    if (newCatFileRef.current) newCatFileRef.current.value = '';
  };

  // Start Edit Category
  const handleStartEditCategory = (cat: CategoryItem) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditingCatImage(cat.image || '');
  };

  // Save Edit Category
  const handleSaveEditCategory = (id: string) => {
    if (!editingCatName.trim()) return;
    const updatedItems = (settings.categoryItems || []).map(c => 
      c.id === id ? { 
        ...c, 
        name: editingCatName.trim(),
        image: editingCatImage.trim() || undefined
      } : c
    );
    setSettings(prev => ({
      ...prev,
      categoryItems: updatedItems
    }));
    persistCategories(updatedItems);
    setEditingCatId(null);
    setEditingCatImage('');
  };

  // Remove Category
  const handleRemoveCategory = (id: string) => {
    const updatedItems = (settings.categoryItems || []).filter(c => c.id !== id);
    setSettings(prev => ({
      ...prev,
      categoryItems: updatedItems
    }));
    persistCategories(updatedItems);
  };

  // Add Subcategory under Category
  const handleAddSubCategory = (catId: string) => {
    if (!newSubCatName.trim()) return;
    const name = newSubCatName.trim();

    let hasError = false;
    const updatedItems = (settings.categoryItems || []).map(c => {
      if (c.id !== catId) return c;
      const currentSubs = c.subcategories || [];
      if (currentSubs.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        setFeedback({
          isOpen: true,
          type: 'info',
          title: 'Already connected',
          message: `"${name}" Sub-CategoryT Already this categoryis in।`
        });
        hasError = true;
        return c;
      }
      const newSub: SubCategoryItem = {
        id: `sub-${Date.now()}`,
        name,
        image: newSubCatImage.trim() || undefined,
        order: currentSubs.length
      };
      return { ...c, subcategories: [...currentSubs, newSub] };
    });

    if (hasError) return;

    setSettings(prev => ({
      ...prev,
      categoryItems: updatedItems
    }));

    persistCategories(updatedItems);
    setNewSubCatName('');
    setNewSubCatImage('');
    if (newSubCatFileRef.current) newSubCatFileRef.current.value = '';
    setActiveAddingSubCatId(null);
  };

  // Start Edit Subcategory
  const handleStartEditSubCategory = (catId: string, sub: SubCategoryItem) => {
    setEditingSubCatKey(`${catId}-${sub.id}`);
    setEditingSubCatName(sub.name);
    setEditingSubCatImage(sub.image || '');
  };

  // Save Edit Subcategory
  const handleSaveEditSubCategory = (catId: string, subId: string) => {
    if (!editingSubCatName.trim()) return;
    const updatedItems = (settings.categoryItems || []).map(c => {
      if (c.id !== catId) return c;
      return {
        ...c,
        subcategories: (c.subcategories || []).map(s => 
          s.id === subId ? { 
            ...s, 
            name: editingSubCatName.trim(),
            image: editingSubCatImage.trim() || undefined
          } : s
        )
      };
    });
    setSettings(prev => ({
      ...prev,
      categoryItems: updatedItems
    }));
    persistCategories(updatedItems);
    setEditingSubCatKey(null);
    setEditingSubCatImage('');
  };

  // Remove Subcategory
  const handleRemoveSubCategory = (catId: string, subId: string) => {
    const updatedItems = (settings.categoryItems || []).map(c => {
      if (c.id !== catId) return c;
      return {
        ...c,
        subcategories: (c.subcategories || []).filter(s => s.id !== subId)
      };
    });
    setSettings(prev => ({
      ...prev,
      categoryItems: updatedItems
    }));
    persistCategories(updatedItems);
  };

  // Move Category Up / Down
  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const list = [...(settings.categoryItems || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    setSettings(prev => ({ ...prev, categoryItems: list }));
    persistCategories(list);
  };

  // Move Subcategory Up / Down
  const moveSubCategory = (catId: string, subIdx: number, direction: 'up' | 'down') => {
    const updatedItems = (settings.categoryItems || []).map(c => {
      if (c.id !== catId) return c;
      const subs = [...(c.subcategories || [])];
      const targetIdx = direction === 'up' ? subIdx - 1 : subIdx + 1;
      if (targetIdx < 0 || targetIdx >= subs.length) return c;

      const temp = subs[subIdx];
      subs[subIdx] = subs[targetIdx];
      subs[targetIdx] = temp;

      return { ...c, subcategories: subs };
    });
    setSettings(prev => ({ ...prev, categoryItems: updatedItems }));
    persistCategories(updatedItems);
  };

  // HTML5 Drag and Drop Handlers for Categories
  const handleDragStartCategory = (index: number) => {
    setDraggedCatIndex(index);
  };

  const handleDragOverCategory = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedCatIndex === null || draggedCatIndex === targetIndex) return;

    const list = [...(settings.categoryItems || [])];
    const draggedItem = list[draggedCatIndex];
    list.splice(draggedCatIndex, 1);
    list.splice(targetIndex, 0, draggedItem);

    setDraggedCatIndex(targetIndex);
    setSettings(prev => ({ ...prev, categoryItems: list }));
  };

  const handleDragEndCategory = () => {
    setDraggedCatIndex(null);
    if (settings.categoryItems) {
      persistCategories(settings.categoryItems);
    }
  };

  // HTML5 Drag and Drop Handlers for Subcategories
  const handleDragStartSubCategory = (catId: string, subIdx: number) => {
    setDraggedSubCatInfo({ catId, subIdx });
  };

  const handleDragOverSubCategory = (e: React.DragEvent, catId: string, targetSubIdx: number) => {
    e.preventDefault();
    if (!draggedSubCatInfo || draggedSubCatInfo.catId !== catId || draggedSubCatInfo.subIdx === targetSubIdx) return;

    setSettings(prev => ({
      ...prev,
      categoryItems: (prev.categoryItems || []).map(c => {
        if (c.id !== catId) return c;
        const subs = [...(c.subcategories || [])];
        const draggedSub = subs[draggedSubCatInfo.subIdx];
        subs.splice(draggedSubCatInfo.subIdx, 1);
        subs.splice(targetSubIdx, 0, draggedSub);

        return { ...c, subcategories: subs };
      })
    }));

    setDraggedSubCatInfo({ catId, subIdx: targetSubIdx });
  };

  const handleDragEndSubCategory = () => {
    setDraggedSubCatInfo(null);
    if (settings.categoryItems) {
      persistCategories(settings.categoryItems);
    }
  };

  const toggleExpand = (catId: string) => {
    setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  if (isLoading) {
    return (
      <CircularProgress label="Loading category data..." size="md" />
    );
  }

  const categoryItems = settings.categoryItems || [];

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Tag className="h-5 w-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              category And Sub-Category Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            category And Sub-Category Create, optional picture add And Arrange by dragging।
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-md transition-all hover:shadow-lg disabled:opacity-50 cursor-pointer" 
          style={{ backgroundColor: primaryColor }}
        >
          {isSaving ? (
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </span>
          ) : saveSuccess ? (
            <>
              <Check className="h-4 w-4 mr-1.5 text-emerald-200" />
              Saved successfully!
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-1.5" />
              category save
            </>
          )}
        </button>
      </div>

      {/* Add New Category Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <Plus className="h-4 w-4 text-amber-600" />
          new root Add category:
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <input
            type="text"
            placeholder="such as: watch, Glasses, skincare..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
            className="w-full sm:flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
          />

          {/* Optional Category Image */}
          <div className="flex items-center gap-2 shrink-0">
            {newCatImage ? (
              <div className="relative group shrink-0">
                <img 
                  src={newCatImage} 
                  alt="Category preview" 
                  className="w-10 h-10 object-cover rounded-xl border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setNewCatImage('')}
                  className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-500 text-white rounded-full shadow-xs cursor-pointer"
                  title="Delete the picture"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label 
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                title="Optional"
              >
                <Upload className="h-3.5 w-3.5 text-slate-500" />
                <span>{isUploadingNewCat ? 'Uploading...' : 'Optional'}</span>
                <input
                  ref={newCatFileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageCompress(file, setNewCatImage, setIsUploadingNewCat);
                  }}
                  className="hidden"
                  disabled={isUploadingNewCat}
                />
              </label>
            )}

            <button
              type="button"
              onClick={handleAddCategory}
              className="px-5 py-2.5 hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5 shrink-0" 
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="h-4 w-4" />
              Add category
            </button>
          </div>
        </div>
      </div>

      {/* Category List with Drag & Drop */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">
            current category list ({categoryItems.length} T)
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            (Drag to the icon or Up/Down Change the order by pressing the button)
          </span>
        </div>

        {categoryItems.length > 0 ? (
          <div className="space-y-3">
            {categoryItems.map((cat, catIdx) => {
              const isExpanded = expandedCats[cat.id] !== false;
              const isEditing = editingCatId === cat.id;

              return (
                <div
                  key={cat.id}
                  draggable={!isEditing}
                  onDragStart={() => handleDragStartCategory(catIdx)}
                  onDragOver={(e) => handleDragOverCategory(e, catIdx)}
                  onDragEnd={handleDragEndCategory}
                  className={`border rounded-xl transition-all ${
                    draggedCatIndex === catIdx
                      ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20'
                      : 'border-slate-200/90 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  {/* Category Card Header */}
                  <div className="p-3.5 sm:p-4 flex items-center justify-between gap-2 bg-white rounded-t-xl border-b border-slate-100">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {/* Drag Handle */}
                      <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-slate-100" title="Move order by dragging">
                        <GripVertical className="h-4.5 w-4.5" />
                      </div>

                      {/* Expand Button */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(cat.id)}
                        className="p-1 text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>

                      {/* Category Thumbnail / Placeholder */}
                      {cat.image ? (
                        <img 
                          src={cat.image} 
                          alt={cat.name} 
                          className="w-8 h-8 object-cover rounded-lg border border-slate-200 shrink-0" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                          <Tag className="h-4 w-4" />
                        </div>
                      )}

                      {/* Title or Edit Input */}
                      {isEditing ? (
                        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-lg">
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEditCategory(cat.id); }}
                            className="px-3 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 flex-1 min-w-[120px] outline-none focus:ring-2 focus:ring-amber-500"
                            autoFocus
                          />

                          {/* Image in edit */}
                          <div className="flex items-center gap-1.5">
                            {editingCatImage ? (
                              <div className="relative group shrink-0">
                                <img 
                                  src={editingCatImage} 
                                  alt="Edit preview" 
                                  className="w-7 h-7 object-cover rounded border border-slate-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditingCatImage('')}
                                  className="absolute -top-1 -right-1 p-0.5 bg-rose-500 text-white rounded-full cursor-pointer"
                                  title="Delete the picture"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ) : (
                              <label className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer text-[11px] font-semibold flex items-center gap-1">
                                <Upload className="h-3 w-3" />
                                <span>picture</span>
                                <input
                                  ref={editCatFileRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageCompress(file, setEditingCatImage, setIsUploadingEditCat);
                                  }}
                                  className="hidden"
                                  disabled={isUploadingEditCat}
                                />
                              </label>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSaveEditCategory(cat.id)}
                            className="p-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer"
                            title="save"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 cursor-pointer"
                            title="canceled"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{cat.name}</span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {cat.subcategories?.length || 0} Sub-Category
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Category Action Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Up/Down buttons */}
                      <button
                        type="button"
                        disabled={catIdx === 0}
                        onClick={() => moveCategory(catIdx, 'up')}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                        title="move up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={catIdx === categoryItems.length - 1}
                        onClick={() => moveCategory(catIdx, 'down')}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                        title="move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>

                      <div className="h-4 w-px bg-slate-200 mx-1"></div>

                      <button
                        type="button"
                        onClick={() => handleStartEditCategory(cat)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveAddingSubCatId(activeAddingSubCatId === cat.id ? null : cat.id);
                          setNewSubCatName('');
                          setNewSubCatImage('');
                        }}
                        className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Sub-Category</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(cat.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        title="Delete category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories Container */}
                  {isExpanded && (
                    <div className="p-3.5 bg-slate-50/70 space-y-2 rounded-b-xl border-t border-slate-100">
                      {/* Subcategory Add Form if active */}
                      {activeAddingSubCatId === cat.id && (
                        <div className="flex flex-col sm:flex-row gap-2 p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-xl mb-3">
                          <input
                            type="text"
                            placeholder="Enter the name of the sub-category..."
                            value={newSubCatName}
                            onChange={(e) => setNewSubCatName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubCategory(cat.id); } }}
                            className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                            autoFocus
                          />

                          {/* Optional Subcategory Image */}
                          <div className="flex items-center gap-2">
                            {newSubCatImage ? (
                              <div className="relative group shrink-0">
                                <img 
                                  src={newSubCatImage} 
                                  alt="Subcategory preview" 
                                  className="w-8 h-8 object-cover rounded-lg border border-amber-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => setNewSubCatImage('')}
                                  className="absolute -top-1 -right-1 p-0.5 bg-rose-500 text-white rounded-full shadow-xs cursor-pointer"
                                  title="Delete the picture"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ) : (
                              <label 
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                                title="Sub-optional"
                              >
                                <Upload className="h-3 w-3 text-amber-600" />
                                <span>{isUploadingNewSubCat ? 'Upload...' : 'Optional'}</span>
                                <input
                                  ref={newSubCatFileRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageCompress(file, setNewSubCatImage, setIsUploadingNewSubCat);
                                  }}
                                  className="hidden"
                                  disabled={isUploadingNewSubCat}
                                />
                              </label>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAddSubCategory(cat.id)}
                              className="px-3 py-1.5 hover:opacity-90 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0" 
                              style={{ backgroundColor: primaryColor }}
                            >
                              add
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => setActiveAddingSubCatId(null)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-amber-100 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Subcategory List */}
                      {cat.subcategories && cat.subcategories.length > 0 ? (
                        <div className="space-y-1.5 pl-3 border-l-2 border-amber-400">
                          {cat.subcategories.map((sub, subIdx) => {
                            const subKey = `${cat.id}-${sub.id}`;
                            const isSubEditing = editingSubCatKey === subKey;
                            const isSubDragged = draggedSubCatInfo?.catId === cat.id && draggedSubCatInfo?.subIdx === subIdx;

                            return (
                              <div
                                key={sub.id}
                                draggable={!isSubEditing}
                                onDragStart={() => handleDragStartSubCategory(cat.id, subIdx)}
                                onDragOver={(e) => handleDragOverSubCategory(e, cat.id, subIdx)}
                                onDragEnd={handleDragEndSubCategory}
                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                  isSubDragged
                                    ? 'bg-amber-100 border border-amber-300 shadow-2xs'
                                    : 'bg-white border border-slate-200/70 hover:border-slate-300 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="cursor-grab text-slate-400 hover:text-amber-600 p-0.5" title="Drag">
                                    <GripVertical className="h-3.5 w-3.5" />
                                  </div>

                                  {/* Subcategory Thumbnail if available */}
                                  {sub.image ? (
                                    <img 
                                      src={sub.image} 
                                      alt={sub.name} 
                                      className="w-6 h-6 object-cover rounded border border-slate-200 shrink-0" 
                                    />
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                                  )}

                                  {isSubEditing ? (
                                    <div className="flex flex-wrap items-center gap-1.5 flex-1">
                                      <input
                                        type="text"
                                        value={editingSubCatName}
                                        onChange={(e) => setEditingSubCatName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEditSubCategory(cat.id, sub.id); }}
                                        className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold text-slate-900 flex-1 min-w-[100px] outline-none"
                                        autoFocus
                                      />

                                      {/* Image in subcategory edit */}
                                      <div className="flex items-center gap-1">
                                        {editingSubCatImage ? (
                                          <div className="relative group shrink-0">
                                            <img 
                                              src={editingSubCatImage} 
                                              alt="Sub preview" 
                                              className="w-6 h-6 object-cover rounded border border-slate-300"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => setEditingSubCatImage('')}
                                              className="absolute -top-1 -right-1 p-0.5 bg-rose-500 text-white rounded-full cursor-pointer"
                                              title="Delete the picture"
                                            >
                                              <X className="h-2 w-2" />
                                            </button>
                                          </div>
                                        ) : (
                                          <label className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded cursor-pointer text-[10px] font-bold flex items-center gap-0.5">
                                            <Upload className="h-2.5 w-2.5" />
                                            <span>picture</span>
                                            <input
                                              ref={editSubCatFileRef}
                                              type="file"
                                              accept="image/*"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleImageCompress(file, setEditingSubCatImage, setIsUploadingEditSubCat);
                                              }}
                                              className="hidden"
                                              disabled={isUploadingEditSubCat}
                                            />
                                          </label>
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleSaveEditSubCategory(cat.id, sub.id)}
                                        className="p-1 bg-amber-600 text-white rounded hover:bg-amber-700 cursor-pointer"
                                        title="save"
                                      >
                                        <Check className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingSubCatKey(null)}
                                        className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 cursor-pointer"
                                        title="canceled"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="font-semibold text-slate-700 truncate">
                                      {sub.name}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={subIdx === 0}
                                    onClick={() => moveSubCategory(cat.id, subIdx, 'up')}
                                    className="p-1 text-slate-400 hover:text-amber-600 disabled:opacity-30 cursor-pointer"
                                    title="above"
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={subIdx === (cat.subcategories?.length || 0) - 1}
                                    onClick={() => moveSubCategory(cat.id, subIdx, 'down')}
                                    className="p-1 text-slate-400 hover:text-amber-600 disabled:opacity-30 cursor-pointer"
                                    title="down"
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleStartEditSubCategory(cat.id, sub)}
                                    className="p-1 text-slate-500 hover:text-indigo-600 cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSubCategory(cat.id, sub.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                    title="Delete sub-categories"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic py-1.5 pl-3">
                          any Sub-Category no। 'Sub-Category' Sub by clicking the button-Add category।
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
            <Tag className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-600">No custom categories have been created</p>
            <p className="text-[11px] text-slate-400">
              above categoryR name by writing 'Add category' First by clicking the button category add।
            </p>
          </div>
        )}
      </div>

      {/* Reusable Centered Feedback Dialog */}
      <FeedbackDialog
        isOpen={feedback.isOpen}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
