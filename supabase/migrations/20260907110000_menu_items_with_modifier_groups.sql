-- Block P pub and cafe passes both independently found the same flat
-- menu_items design (proposed by the original bar pass's gap #3) doesn't
-- hold: a pub's 30+ item menu and a cafe's modifier-heavy menu (GF bread
-- swap, dairy-free milk, vegan protein swap applied across most items,
-- 2-3 independent modifiers per item) both need a base-item-plus-modifier
-- relationship, not a bigger flat table with one allergens column.

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  name text not null,
  category text, -- e.g. food | drink
  base_allergens text[] default '{}', -- allergens inherent to the item as standardly served
  description text,
  created_at timestamptz default now()
);
alter table menu_items enable row level security;
create policy venue_isolation_menu_items on menu_items
  for all using (venue_id = private.auth_venue_id());

create table menu_item_modifier_groups (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid references menu_items(id) on delete cascade,
  name text not null, -- e.g. "Milk type", "Bread", "Protein swap"
  created_at timestamptz default now()
);
alter table menu_item_modifier_groups enable row level security;
create policy venue_isolation_menu_item_modifier_groups on menu_item_modifier_groups
  for all using (menu_item_id in (select id from menu_items where venue_id = private.auth_venue_id()));

create table menu_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  modifier_group_id uuid references menu_item_modifier_groups(id) on delete cascade,
  name text not null, -- e.g. "Dairy-free milk", "Gluten-free bread", "Tofu scramble"
  allergens_added text[] default '{}',   -- allergens this option introduces vs. the base item
  allergens_removed text[] default '{}', -- allergens this option removes vs. the base item
  created_at timestamptz default now()
);
alter table menu_item_modifiers enable row level security;
create policy venue_isolation_menu_item_modifiers on menu_item_modifiers
  for all using (modifier_group_id in (
    select mg.id from menu_item_modifier_groups mg
    join menu_items mi on mi.id = mg.menu_item_id
    where mi.venue_id = private.auth_venue_id()
  ));
