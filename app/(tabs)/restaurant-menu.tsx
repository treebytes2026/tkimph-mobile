import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, MobileShell } from '@/components/mobile-shell';
import {
  formatPartnerMoney,
  PartnerActionButton,
  PartnerEmpty,
  PartnerNotice,
  StatusChip,
} from '@/components/restaurant-workflow';
import { BodyText, Kicker, ScreenTitle, SectionHeader } from '@/components/ui-kit';
import { TkimphPalette } from '@/constants/theme';
import { hasRestaurantOwnerSession, useAuthSession } from '@/hooks/use-auth-session';
import {
  createPartnerMenu,
  createPartnerMenuItem,
  deletePartnerMenu,
  deletePartnerMenuItem,
  deletePartnerMenuItemImage,
  fetchPartnerMenu,
  fetchPartnerMenuCategories,
  fetchPartnerMenus,
  fetchPartnerOverview,
  PartnerMenu,
  PartnerMenuCategory,
  PartnerMenuItem,
  PartnerRestaurant,
  updatePartnerMenu,
  updatePartnerMenuItem,
  UploadFile,
  uploadPartnerMenuItemImage,
} from '@/lib/api';
import { pickImageUpload } from '@/lib/uploads';

type MenuForm = {
  name: string;
  discount_enabled: boolean;
  discount_percent: string;
};

type ItemForm = {
  name: string;
  description: string;
  price: string;
  menu_category_id: string;
  discount_enabled: boolean;
  discount_percent: string;
};

function blurActiveElement() {
  if (Platform.OS !== 'web') return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

function itemCategory(item: PartnerMenuItem) {
  return item.menu_category?.name ?? item.menuCategory?.name ?? 'Uncategorized';
}

function updateCachedSelectedMenu(
  current: PartnerMenu | null,
  updateItems: (items: PartnerMenuItem[]) => PartnerMenuItem[],
  cache: Map<number, PartnerMenu>
) {
  if (!current) return current;
  const next = { ...current, items: updateItems(current.items ?? []) };
  cache.set(next.id, next);
  return next;
}

export default function RestaurantMenuScreen() {
  const auth = useAuthSession();
  const canView = auth.isRestaurantOwner;
  const [restaurant, setRestaurant] = useState<PartnerRestaurant | null>(null);
  const [menus, setMenus] = useState<PartnerMenu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<PartnerMenu | null>(null);
  const [categories, setCategories] = useState<PartnerMenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingMenu, setEditingMenu] = useState<PartnerMenu | null>(null);
  const [editingItem, setEditingItem] = useState<PartnerMenuItem | null>(null);
  const [creatingMenu, setCreatingMenu] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [deleteMenuTarget, setDeleteMenuTarget] = useState<PartnerMenu | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<PartnerMenuItem | null>(null);
  const [createItemImage, setCreateItemImage] = useState<UploadFile | null>(null);
  const selectedMenuIdRef = useRef<number | null>(null);
  const menuCacheRef = useRef<Map<number, PartnerMenu>>(new Map());
  const [loadingMenuId, setLoadingMenuId] = useState<number | null>(null);
  const [menuForm, setMenuForm] = useState<MenuForm>({ name: '', discount_enabled: false, discount_percent: '0' });
  const [itemForm, setItemForm] = useState<ItemForm>({
    name: '',
    description: '',
    price: '0',
    menu_category_id: '',
    discount_enabled: false,
    discount_percent: '0',
  });

  const availableItems = useMemo(() => (selectedMenu?.items ?? []).filter((item) => item.is_available).length, [selectedMenu?.items]);

  useEffect(() => {
    selectedMenuIdRef.current = selectedMenu?.id ?? null;
  }, [selectedMenu?.id]);

  const resetMenu = useCallback(() => {
    setRestaurant(null);
    setMenus([]);
    setSelectedMenu(null);
    setCategories([]);
    setLoading(false);
    setLoadingMenuId(null);
    menuCacheRef.current.clear();
    setActingKey(null);
    setError(null);
    setMessage(null);
    setEditingMenu(null);
    setEditingItem(null);
    setCreatingMenu(false);
    setCreatingItem(false);
    setDeleteMenuTarget(null);
    setDeleteItemTarget(null);
    setCreateItemImage(null);
  }, []);

  const loadMenu = useCallback(async () => {
    if (!hasRestaurantOwnerSession()) {
      resetMenu();
      return;
    }
    setLoading(true);
    try {
      const [overview, nextCategories] = await Promise.all([fetchPartnerOverview(), fetchPartnerMenuCategories()]);
      if (!hasRestaurantOwnerSession()) return;
      const nextRestaurant = overview.restaurants[0] ?? null;
      setRestaurant(nextRestaurant);
      setCategories(nextCategories.data);
      if (!nextRestaurant) {
        setMenus([]);
        setSelectedMenu(null);
        return;
      }
      const nextMenus = await fetchPartnerMenus(nextRestaurant.id);
      if (!hasRestaurantOwnerSession()) return;
      setMenus(nextMenus.data);
      const currentMenuStillExists = nextMenus.data.some((menu) => menu.id === selectedMenuIdRef.current);
      const targetMenuId = currentMenuStillExists ? selectedMenuIdRef.current : nextMenus.data[0]?.id;
      if (targetMenuId) {
        const detail = await fetchPartnerMenu(nextRestaurant.id, targetMenuId);
        if (!hasRestaurantOwnerSession()) return;
        menuCacheRef.current.set(detail.id, detail);
        setSelectedMenu(detail);
      } else {
        setSelectedMenu(null);
      }
      setError(null);
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not load restaurant menu.');
    } finally {
      if (hasRestaurantOwnerSession()) setLoading(false);
    }
  }, [resetMenu]);

  useEffect(() => {
    if (!canView) {
      resetMenu();
      return;
    }
    void loadMenu();
  }, [canView, loadMenu, resetMenu]);

  async function selectMenu(menu: PartnerMenu) {
    if (!restaurant || !hasRestaurantOwnerSession()) return;
    if (selectedMenu?.id === menu.id) return;
    selectedMenuIdRef.current = menu.id;
    const cached = menuCacheRef.current.get(menu.id);
    if (cached) {
      setSelectedMenu(cached);
      return;
    }
    setSelectedMenu({ ...menu, items: [] });
    setLoadingMenuId(menu.id);
    try {
      const detail = await fetchPartnerMenu(restaurant.id, menu.id);
      if (!hasRestaurantOwnerSession()) return;
      menuCacheRef.current.set(detail.id, detail);
      if (selectedMenuIdRef.current !== detail.id) return;
      setSelectedMenu(detail);
      setError(null);
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not load menu details.');
    } finally {
      if (hasRestaurantOwnerSession() && selectedMenuIdRef.current === menu.id) setLoadingMenuId(null);
    }
  }

  async function toggleMenu(menu: PartnerMenu) {
    if (!restaurant || !hasRestaurantOwnerSession()) return;
    const key = `menu-${menu.id}`;
    setActingKey(key);
    setError(null);
    setMessage(null);
    try {
      const updated = await updatePartnerMenu(restaurant.id, menu.id, { is_active: !menu.is_active });
      if (!hasRestaurantOwnerSession()) return;
      setMenus((current) => current.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)));
      setSelectedMenu((current) => {
        const next = current?.id === updated.id ? { ...current, ...updated } : current;
        if (next?.id === updated.id) menuCacheRef.current.set(updated.id, next);
        return next;
      });
      setMessage(`${updated.name} is now ${updated.is_active ? 'active' : 'inactive'}.`);
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not update menu availability.');
    } finally {
      if (hasRestaurantOwnerSession()) setActingKey(null);
    }
  }

  async function toggleItem(item: PartnerMenuItem) {
    if (!restaurant || !selectedMenu || !hasRestaurantOwnerSession()) return;
    const key = `item-${item.id}`;
    setActingKey(key);
    setError(null);
    setMessage(null);
    try {
      const updated = await updatePartnerMenuItem(restaurant.id, selectedMenu.id, item.id, { is_available: !item.is_available });
      if (!hasRestaurantOwnerSession()) return;
      setSelectedMenu((current) =>
        updateCachedSelectedMenu(current, (items) => items.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)), menuCacheRef.current)
      );
      setMessage(`${updated.name} is now ${updated.is_available ? 'available' : 'unavailable'}.`);
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not update item availability.');
    } finally {
      if (hasRestaurantOwnerSession()) setActingKey(null);
    }
  }

  function openMenuEditor(menu: PartnerMenu) {
    setEditingMenu(menu);
    setMenuForm({
      name: menu.name,
      discount_enabled: Boolean(menu.discount_enabled),
      discount_percent: String(menu.discount_percent ?? 0),
    });
  }

  function openMenuCreator() {
    setCreatingMenu(true);
    setMenuForm({ name: '', discount_enabled: false, discount_percent: '0' });
  }

  function openItemEditor(item: PartnerMenuItem) {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description ?? '',
      price: String(item.price ?? 0),
      menu_category_id: item.menu_category_id ? String(item.menu_category_id) : String(categories[0]?.id ?? ''),
      discount_enabled: Boolean(item.discount_enabled),
      discount_percent: String(item.discount_percent ?? 0),
    });
  }

  function openItemCreator() {
    setCreatingItem(true);
    setCreateItemImage(null);
    setItemForm({
      name: '',
      description: '',
      price: '0',
      menu_category_id: String(categories[0]?.id ?? ''),
      discount_enabled: false,
      discount_percent: '0',
    });
  }

  async function createMenu() {
    if (!restaurant || !hasRestaurantOwnerSession()) return;
    blurActiveElement();
    setActingKey('menu-create');
    try {
      const created = await createPartnerMenu(restaurant.id, {
        name: menuForm.name.trim(),
        is_active: true,
        discount_enabled: menuForm.discount_enabled,
        discount_percent: Number(menuForm.discount_percent || 0),
      });
      if (!hasRestaurantOwnerSession()) return;
      const detail = await fetchPartnerMenu(restaurant.id, created.id);
      if (!hasRestaurantOwnerSession()) return;
      menuCacheRef.current.set(detail.id, detail);
      setMenus((current) => [...current, created]);
      setSelectedMenu(detail);
      setCreatingMenu(false);
      setMessage('Menu created.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not create menu.');
    } finally {
      if (hasRestaurantOwnerSession()) setActingKey(null);
    }
  }

  async function saveMenuEdit() {
    if (!restaurant || !editingMenu || !hasRestaurantOwnerSession()) return;
    blurActiveElement();
    setActingKey(`menu-edit-${editingMenu.id}`);
    try {
      const updated = await updatePartnerMenu(restaurant.id, editingMenu.id, {
        name: menuForm.name.trim(),
        discount_enabled: menuForm.discount_enabled,
        discount_percent: Number(menuForm.discount_percent || 0),
      });
      if (!hasRestaurantOwnerSession()) return;
      setMenus((current) => current.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)));
      setSelectedMenu((current) => (current?.id === updated.id ? { ...current, ...updated } : current));
      menuCacheRef.current.set(updated.id, { ...(menuCacheRef.current.get(updated.id) ?? updated), ...updated });
      setEditingMenu(null);
      setMessage('Menu updated.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not save menu.');
    } finally {
      if (hasRestaurantOwnerSession()) setActingKey(null);
    }
  }

  async function confirmDeleteMenu() {
    if (!restaurant || !deleteMenuTarget || !hasRestaurantOwnerSession()) return;
    const target = deleteMenuTarget;
    setActingKey(`menu-delete-${target.id}`);
    try {
      await deletePartnerMenu(restaurant.id, target.id);
      if (!hasRestaurantOwnerSession()) return;
      const remaining = menus.filter((entry) => entry.id !== target.id);
      setMenus(remaining);
      setDeleteMenuTarget(null);
      setMessage('Menu deleted.');
      if (selectedMenu?.id === target.id) {
        if (remaining[0]) await selectMenu(remaining[0]);
        else setSelectedMenu(null);
      }
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not delete menu.');
    } finally {
      if (hasRestaurantOwnerSession()) setActingKey(null);
    }
  }

  async function createItem() {
    if (!restaurant || !selectedMenu || !hasRestaurantOwnerSession()) return;
    blurActiveElement();
    setActingKey('item-create');
    try {
      const created = await createPartnerMenuItem(restaurant.id, selectedMenu.id, {
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || null,
        price: itemForm.price.trim(),
        menu_category_id: Number(itemForm.menu_category_id || categories[0]?.id),
        discount_enabled: itemForm.discount_enabled,
        discount_percent: Number(itemForm.discount_percent || 0),
        is_available: true,
      });
      if (!hasRestaurantOwnerSession()) return;
      let nextItem = created;
      if (createItemImage) {
        try {
          nextItem = await uploadPartnerMenuItemImage(restaurant.id, selectedMenu.id, created.id, createItemImage);
          if (!hasRestaurantOwnerSession()) return;
        } catch (imageErr) {
          if (!hasRestaurantOwnerSession()) return;
          setError(imageErr instanceof Error ? `Dish created, but image upload failed: ${imageErr.message}` : 'Dish created, but image upload failed.');
        }
      }
      setSelectedMenu((current) => (current ? { ...current, items: [...(current.items ?? []), nextItem] } : current));
      menuCacheRef.current.set(selectedMenu.id, { ...selectedMenu, items: [...(selectedMenu.items ?? []), nextItem] });
      setCreatingItem(false);
      setCreateItemImage(null);
      setMessage(nextItem.image_url ? 'Dish created with image.' : 'Dish created.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not create item.');
    } finally {
      if (hasRestaurantOwnerSession()) setActingKey(null);
    }
  }

  async function saveItemEdit() {
    if (!restaurant || !selectedMenu || !editingItem || !hasRestaurantOwnerSession()) return;
    blurActiveElement();
    setActingKey(`item-edit-${editingItem.id}`);
    try {
      const payload = {
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || null,
        price: itemForm.price.trim(),
        menu_category_id: Number(itemForm.menu_category_id || editingItem.menu_category_id || categories[0]?.id),
        discount_enabled: itemForm.discount_enabled,
        discount_percent: Number(itemForm.discount_percent || 0),
      };
      const updated = await updatePartnerMenuItem(restaurant.id, selectedMenu.id, editingItem.id, payload);
      if (!hasRestaurantOwnerSession()) return;
      setSelectedMenu((current) =>
        updateCachedSelectedMenu(current, (items) => items.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)), menuCacheRef.current)
      );
      setEditingItem(null);
      setMessage('Item updated.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not save item.');
    } finally {
      if (hasRestaurantOwnerSession()) setActingKey(null);
    }
  }

  async function confirmDeleteItem() {
    if (!restaurant || !selectedMenu || !deleteItemTarget || !hasRestaurantOwnerSession()) return;
    const target = deleteItemTarget;
    setActingKey(`item-delete-${target.id}`);
    try {
      await deletePartnerMenuItem(restaurant.id, selectedMenu.id, target.id);
      if (!hasRestaurantOwnerSession()) return;
      setSelectedMenu((current) =>
        updateCachedSelectedMenu(current, (items) => items.filter((entry) => entry.id !== target.id), menuCacheRef.current)
      );
      setDeleteItemTarget(null);
      setMessage('Item deleted.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not delete item.');
    } finally {
      if (hasRestaurantOwnerSession()) setActingKey(null);
    }
  }

  async function uploadItemImage(item: PartnerMenuItem) {
    if (!restaurant || !selectedMenu || !hasRestaurantOwnerSession()) return;
    try {
      const file = await pickImageUpload();
      if (!file || !hasRestaurantOwnerSession()) return;
      setActingKey(`item-image-${item.id}`);
      const updated = await uploadPartnerMenuItemImage(restaurant.id, selectedMenu.id, item.id, file);
      if (!hasRestaurantOwnerSession()) return;
      setSelectedMenu((current) =>
        updateCachedSelectedMenu(current, (items) => items.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)), menuCacheRef.current)
      );
      setMessage('Item image uploaded.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not upload item image.');
    } finally {
      if (hasRestaurantOwnerSession()) setActingKey(null);
    }
  }

  async function chooseCreateItemImage() {
    try {
      const file = await pickImageUpload();
      if (file) setCreateItemImage(file);
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not choose dish image.');
    }
  }

  async function deleteItemImage(item: PartnerMenuItem) {
    if (!restaurant || !selectedMenu || !hasRestaurantOwnerSession()) return;
    setActingKey(`item-image-${item.id}`);
    try {
      const updated = await deletePartnerMenuItemImage(restaurant.id, selectedMenu.id, item.id);
      if (!hasRestaurantOwnerSession()) return;
      setSelectedMenu((current) =>
        updateCachedSelectedMenu(current, (items) => items.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)), menuCacheRef.current)
      );
      setMessage('Item image deleted.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not delete item image.');
    } finally {
      if (hasRestaurantOwnerSession()) setActingKey(null);
    }
  }

  if (!canView) {
    return (
      <MobileShell>
        <Kicker>Restaurant menu</Kicker>
        <ScreenTitle>Restaurant login required.</ScreenTitle>
        <BodyText>Sign in with an approved restaurant owner account to manage menu availability.</BodyText>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <View style={styles.hero}>
        <Kicker>Menu operations</Kicker>
        <ScreenTitle>Menu availability</ScreenTitle>
        <BodyText>Keep menus and items accurate while the kitchen is open.</BodyText>
      </View>

      {error ? <PartnerNotice tone="danger" text={error} /> : null}
      {message ? <PartnerNotice tone="success" text={message} /> : null}

      <View style={styles.refreshRow}>
        <Text style={styles.refreshText}>{loading ? 'Loading menu...' : restaurant?.name ?? 'No restaurant linked'}</Text>
        <PartnerActionButton compact icon="add" label="New menu" disabled={!restaurant} onPress={openMenuCreator} />
        <PartnerActionButton compact tone="outline" icon="refresh" label="Refresh" disabled={loading} onPress={() => void loadMenu()} />
      </View>

      {menus.length === 0 ? (
        <PartnerEmpty icon="restaurant-menu" title="No menus yet" text="Menus created in the partner backend will appear here." />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.menuTabs}>
            {menus.map((menu) => {
              const active = selectedMenu?.id === menu.id;
              return (
                <Pressable key={menu.id} onPress={() => void selectMenu(menu)} style={[styles.menuTab, active && styles.menuTabActive]}>
                  <Text style={[styles.menuTabText, active && styles.menuTabTextActive]}>{menu.name}</Text>
                  <Text style={[styles.menuTabCount, active && styles.menuTabTextActive]}>{menu.items_count ?? menu.items?.length ?? 0}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {selectedMenu ? (
            <Card>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={styles.menuTitle}>{selectedMenu.name}</Text>
                  <Text style={styles.meta}>{availableItems} available of {selectedMenu.items?.length ?? 0} items</Text>
                </View>
                <StatusChip tone={selectedMenu.is_active ? 'green' : 'yellow'}>{selectedMenu.is_active ? 'active' : 'inactive'}</StatusChip>
              </View>
              <View style={styles.cardActions}>
                <PartnerActionButton
                  compact
                  tone={selectedMenu.is_active ? 'yellow' : 'green'}
                  icon={selectedMenu.is_active ? 'pause' : 'play-arrow'}
                  label={actingKey === `menu-${selectedMenu.id}` ? 'Updating' : selectedMenu.is_active ? 'Disable menu' : 'Enable menu'}
                  disabled={actingKey === `menu-${selectedMenu.id}`}
                  onPress={() => void toggleMenu(selectedMenu)}
                />
                <PartnerActionButton compact tone="outline" icon="edit" label="Edit menu" onPress={() => openMenuEditor(selectedMenu)} />
                <PartnerActionButton compact tone="red" icon="delete" label="Delete" onPress={() => setDeleteMenuTarget(selectedMenu)} />
              </View>
            </Card>
          ) : null}

          <SectionHeader title="Items" action={`${selectedMenu?.items?.length ?? 0} shown`} />
          {selectedMenu ? (
            <View style={styles.addItemRow}>
              <PartnerActionButton compact icon="add" label="Add dish" onPress={openItemCreator} />
            </View>
          ) : null}
          {loadingMenuId === selectedMenu?.id ? (
            <PartnerEmpty icon="hourglass-empty" title="Loading dishes" text="Fetching this menu's dishes now." />
          ) : (selectedMenu?.items ?? []).length === 0 ? (
            <PartnerEmpty icon="fastfood" title="No items in this menu" text="Items will appear here after they are added in the partner backend." />
          ) : (
            (selectedMenu?.items ?? []).map((item) => (
              <Card key={item.id}>
                <View style={styles.itemHeader}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemImageEmpty}>
                      <MaterialIcons color={TkimphPalette.muted} name="image" size={26} />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <View style={styles.rowBetween}>
                      <View style={styles.flex}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.meta}>{itemCategory(item)} | {formatPartnerMoney(item.price)}</Text>
                        {item.discount_enabled ? <Text style={styles.discount}>{Number(item.discount_percent || 0)}% discount active</Text> : null}
                      </View>
                      <StatusChip tone={item.is_available ? 'green' : 'red'}>{item.is_available ? 'available' : 'hidden'}</StatusChip>
                    </View>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <PartnerActionButton
                    compact
                    tone={item.is_available ? 'yellow' : 'green'}
                    icon={item.is_available ? 'visibility-off' : 'visibility'}
                    label={actingKey === `item-${item.id}` ? 'Updating' : item.is_available ? 'Mark unavailable' : 'Mark available'}
                    disabled={actingKey === `item-${item.id}`}
                    onPress={() => void toggleItem(item)}
                  />
                  <PartnerActionButton compact tone="outline" icon="edit" label="Edit item" onPress={() => openItemEditor(item)} />
                  <PartnerActionButton
                    compact
                    tone="outline"
                    icon="image"
                    label={item.image_url ? 'Replace image' : 'Upload image'}
                    disabled={actingKey === `item-image-${item.id}`}
                    onPress={() => void uploadItemImage(item)}
                  />
                  {item.image_url ? (
                    <PartnerActionButton compact tone="outline" icon="hide-image" label="Remove image" onPress={() => void deleteItemImage(item)} />
                  ) : null}
                  <PartnerActionButton compact tone="red" icon="delete" label="Delete" onPress={() => setDeleteItemTarget(item)} />
                </View>
              </Card>
            ))
          )}
        </>
      )}

      <MenuEditModal
        visible={Boolean(editingMenu)}
        title="Edit menu"
        form={menuForm}
        saving={actingKey === `menu-edit-${editingMenu?.id}`}
        onChange={setMenuForm}
        onClose={() => setEditingMenu(null)}
        onSave={() => void saveMenuEdit()}
      />
      <MenuEditModal
        visible={creatingMenu}
        title="Create menu"
        form={menuForm}
        saving={actingKey === 'menu-create'}
        onChange={setMenuForm}
        onClose={() => setCreatingMenu(false)}
        onSave={() => void createMenu()}
      />
      <ItemEditModal
        visible={Boolean(editingItem)}
        title="Edit item"
        categories={categories}
        form={itemForm}
        saving={actingKey === `item-edit-${editingItem?.id}`}
        onChange={setItemForm}
        onClose={() => setEditingItem(null)}
        onSave={() => void saveItemEdit()}
      />
      <ItemEditModal
        visible={creatingItem}
        title="Add dish"
        categories={categories}
        form={itemForm}
        saving={actingKey === 'item-create'}
        imageName={createItemImage?.name}
        imageUri={createItemImage?.uri}
        onChange={setItemForm}
        onPickImage={() => void chooseCreateItemImage()}
        onClose={() => setCreatingItem(false)}
        onSave={() => void createItem()}
      />
      <ConfirmModal
        visible={Boolean(deleteMenuTarget)}
        title="Delete menu?"
        text={`This will remove ${deleteMenuTarget?.name ?? 'this menu'} and its items.`}
        saving={actingKey === `menu-delete-${deleteMenuTarget?.id}`}
        onClose={() => setDeleteMenuTarget(null)}
        onConfirm={() => void confirmDeleteMenu()}
      />
      <ConfirmModal
        visible={Boolean(deleteItemTarget)}
        title="Delete item?"
        text={`This will remove ${deleteItemTarget?.name ?? 'this item'} from the menu.`}
        saving={actingKey === `item-delete-${deleteItemTarget?.id}`}
        onClose={() => setDeleteItemTarget(null)}
        onConfirm={() => void confirmDeleteItem()}
      />
    </MobileShell>
  );
}

function MenuEditModal({
  visible,
  title,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  form: MenuForm;
  saving: boolean;
  onChange: (form: MenuForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ModalHeader title={title} onClose={onClose} />
          <TextInput placeholder="Menu name" placeholderTextColor={TkimphPalette.muted} value={form.name} onChangeText={(name) => onChange({ ...form, name })} style={styles.input} />
          <ToggleRow label="Menu discount" active={form.discount_enabled} onPress={() => onChange({ ...form, discount_enabled: !form.discount_enabled })} />
          <TextInput
            keyboardType="numeric"
            placeholder="Discount percent"
            placeholderTextColor={TkimphPalette.muted}
            value={form.discount_percent}
            onChangeText={(discount_percent) => onChange({ ...form, discount_percent })}
            style={styles.input}
          />
          <PartnerActionButton label={saving ? 'Saving' : title} icon="save" disabled={saving || !form.name.trim()} onPress={onSave} />
        </View>
      </View>
    </Modal>
  );
}

function ItemEditModal({
  visible,
  title,
  categories,
  form,
  saving,
  imageName,
  imageUri,
  onChange,
  onPickImage,
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  categories: PartnerMenuCategory[];
  form: ItemForm;
  saving: boolean;
  imageName?: string;
  imageUri?: string;
  onChange: (form: ItemForm) => void;
  onPickImage?: () => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ModalHeader title={title} onClose={onClose} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
            {onPickImage ? <DishImagePicker imageName={imageName} imageUri={imageUri} onPress={onPickImage} /> : null}
            <Text style={styles.fieldLabel}>Dish name</Text>
            <TextInput placeholder="Chicken sisig, Halo-halo, etc." placeholderTextColor={TkimphPalette.muted} value={form.name} onChangeText={(name) => onChange({ ...form, name })} style={styles.input} />
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              multiline
              placeholder="Short description for customers"
              placeholderTextColor={TkimphPalette.muted}
              value={form.description}
              onChangeText={(description) => onChange({ ...form, description })}
              style={[styles.input, styles.textArea]}
            />
            <Text style={styles.fieldLabel}>Price</Text>
            <TextInput keyboardType="numeric" placeholder="0.00" placeholderTextColor={TkimphPalette.muted} value={form.price} onChangeText={(price) => onChange({ ...form, price })} style={styles.input} />
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryList}>
              {categories.map((category) => {
                const active = form.menu_category_id === String(category.id);
                return (
                  <Pressable key={category.id} onPress={() => onChange({ ...form, menu_category_id: String(category.id) })} style={[styles.categoryButton, active && styles.categoryButtonActive]}>
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{category.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <ToggleRow label="Item discount" active={form.discount_enabled} onPress={() => onChange({ ...form, discount_enabled: !form.discount_enabled })} />
            <TextInput
              keyboardType="numeric"
              placeholder="Discount percent"
              placeholderTextColor={TkimphPalette.muted}
              value={form.discount_percent}
              onChangeText={(discount_percent) => onChange({ ...form, discount_percent })}
              style={styles.input}
            />
            <PartnerActionButton label={saving ? 'Saving' : title} icon="save" disabled={saving || !form.name.trim() || !form.price.trim()} onPress={onSave} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DishImagePicker({
  imageName,
  imageUri,
  onPress,
}: {
  imageName?: string;
  imageUri?: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.imagePicker}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.imagePickerPreview} />
      ) : (
        <View style={styles.imagePickerEmpty}>
          <MaterialIcons color={TkimphPalette.green} name="add-photo-alternate" size={28} />
        </View>
      )}
      <View style={styles.imagePickerText}>
        <Text style={styles.imagePickerTitle}>{imageUri ? 'Dish image selected' : 'Add dish image'}</Text>
        <Text numberOfLines={1} ellipsizeMode="middle" style={styles.imagePickerSubtitle}>
          {imageName || 'Choose a clear food photo'}
        </Text>
      </View>
      <MaterialIcons color={TkimphPalette.muted} name="chevron-right" size={22} />
    </Pressable>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>{title}</Text>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
        <MaterialIcons color={TkimphPalette.ink} name="close" size={21} />
      </Pressable>
    </View>
  );
}

function ToggleRow({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, active && styles.toggleTrackActive]}>
        <View style={[styles.toggleKnob, active && styles.toggleKnobActive]} />
      </View>
    </Pressable>
  );
}

function ConfirmModal({
  visible,
  title,
  text,
  saving,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  text: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ModalHeader title={title} onClose={onClose} />
          <Text style={styles.meta}>{text}</Text>
          <View style={styles.cardActions}>
            <PartnerActionButton tone="outline" label="Cancel" onPress={onClose} />
            <PartnerActionButton tone="red" icon="delete" label={saving ? 'Deleting' : 'Delete'} disabled={saving} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 0,
  },
  refreshRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 16,
  },
  refreshText: {
    color: TkimphPalette.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  menuTabs: {
    gap: 8,
    paddingVertical: 16,
  },
  menuTab: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  menuTabActive: {
    backgroundColor: '#E8F3ED',
    borderColor: TkimphPalette.green,
  },
  menuTabText: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  menuTabTextActive: {
    color: TkimphPalette.green,
  },
  menuTabCount: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  menuTitle: {
    color: TkimphPalette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  itemName: {
    color: TkimphPalette.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  itemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemImage: {
    backgroundColor: '#EEF2F6',
    borderRadius: 12,
    height: 74,
    width: 74,
  },
  itemImageEmpty: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    height: 74,
    justifyContent: 'center',
    width: 74,
  },
  meta: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 5,
  },
  discount: {
    color: TkimphPalette.green,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  addItemRow: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.46)',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    maxHeight: '86%',
    maxWidth: 430,
    padding: 16,
    width: '100%',
  },
  modalScroll: {
    gap: 9,
    paddingTop: 4,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: TkimphPalette.ink,
    fontSize: 19,
    fontWeight: '900',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E4E7EC',
    borderRadius: 12,
    borderWidth: 1,
    color: TkimphPalette.ink,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  textArea: {
    minHeight: 82,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    color: TkimphPalette.ink,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  imagePicker: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#DDE7F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 86,
    padding: 10,
  },
  imagePickerEmpty: {
    alignItems: 'center',
    backgroundColor: '#E8F3ED',
    borderRadius: 12,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  imagePickerPreview: {
    backgroundColor: '#EEF2F6',
    borderRadius: 12,
    height: 64,
    width: 64,
  },
  imagePickerText: {
    flex: 1,
  },
  imagePickerTitle: {
    color: TkimphPalette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  imagePickerSubtitle: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E4E7EC',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryButtonActive: {
    backgroundColor: '#E8F3ED',
    borderColor: TkimphPalette.green,
  },
  categoryText: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  categoryTextActive: {
    color: TkimphPalette.green,
  },
  toggleRow: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E4E7EC',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  toggleLabel: {
    color: TkimphPalette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  toggleTrack: {
    backgroundColor: '#CBD5E1',
    borderRadius: 999,
    height: 24,
    padding: 2,
    width: 44,
  },
  toggleTrackActive: {
    backgroundColor: TkimphPalette.green,
  },
  toggleKnob: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    height: 20,
    width: 20,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
});
