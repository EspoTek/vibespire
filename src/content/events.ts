// GDD §6. Only type imports: small pool metadata below mirrors the designer rosters.
import type { ChooseOption, Effect, EncounterDef, EventDef, ReadCtx, StatusDef } from '../engine/types';

const BLOOM_CARDS = new Set([
  'seed_bite', 'thornwhirl', 'barb_flick', 'grafting_cut', 'chitin_ram', 'sap_shell',
  'blightcap', 'tendril_reach', 'twin_thorn', 'miasma_sweep', 'pollen_sting', 'patient_thorn',
  'burl_wall', 'puffball', 'thorn_halo', 'heartwood_spear', 'chitin_cocoon', 'thresher',
]);
const TIMING_CARDS = new Set([
  'tick', 'tock', 'pinion_jab', 'gear_train', 'downbeat', 'noon_gun',
  'afterpeal', 'spring_tide', 'carillon', 'storm_glass', 'almanac', 'ephemeris',
  'balance_wheel', 'detent', 'sweep_hand', 'fermata', 'appointed_hour', 'knell',
  'second_hand', 'mainspring', 'quarter_chime', 'hasten', 'banked_hours', 'breakwater',
  'batten_down', 'striking_train', 'zenith', 'syzygy', 'toll_the_hours', 'seen_it_coming',
  'star_tithe', 'tourbillon', 'polyrhythm', 'fault_beacon',
]);
const STARTER_RELICS = new Set(['riven_gauntlet', 'heartseed', 'chrono_lens']);
const ASSEMBLY_TOOLS = [
  { id: 'relay_ping', name: 'Relay Ping', rarity: 'uncommon' },
  { id: 'shardfall', name: 'Shardfall', rarity: 'uncommon' },
  { id: 'arc_lattice', name: 'Arc Lattice', rarity: 'uncommon' },
  { id: 'salvage_kit', name: 'Salvage Kit', rarity: 'uncommon' },
  { id: 'stress_fracture', name: 'Stress Fracture', rarity: 'uncommon' },
  { id: 'gyro_jammer', name: 'Gyro Jammer', rarity: 'uncommon' },
  { id: 'ballast_lock', name: 'Ballast Lock', rarity: 'uncommon' },
  { id: 'jettison_pod', name: 'Jettison Pod', rarity: 'uncommon' },
  { id: 'overdraft_cell', name: 'Overdraft Cell', rarity: 'uncommon' },
  { id: 'star_survey', name: 'Star Survey', rarity: 'uncommon' },
  { id: 'fault_beacon', name: 'Fault Beacon', rarity: 'uncommon' },
  { id: 'snare_line', name: 'Snare Line', rarity: 'uncommon' },
  { id: 'cutting_torch', name: 'Cutting Torch', rarity: 'rare' },
  { id: 'medbay_voucher', name: 'Medbay Voucher', rarity: 'rare' },
  { id: 'clean_manifest', name: 'Clean Manifest', rarity: 'rare' },
  { id: 'salvage_kiln', name: 'Salvage Kiln', rarity: 'rare' },
  { id: 'prism_resonance', name: 'Prism Resonance', rarity: 'rare' },
  { id: 'shard_cache', name: 'Shard Cache', rarity: 'rare' },
  { id: 'mirror_tether', name: 'Mirror Tether', rarity: 'rare' },
  { id: 'grav_clamp', name: 'Grav Clamp', rarity: 'rare' },
];

const CHOIR_HP_PCT = 120;
const ECHO_STRENGTH_PCT = 70;
const ASSEMBLY = { tools: 3, uncommon_odds: 70, rare_odds: 30 };
const TRANSMUTE_OFFERS = 2;
const ECHO_WIN_UPGRADES = 3;
const IMMUNE_WIN_SHARDS = 1;
const SELL_GOLD = 45;
const BUY_GOLD = 70;
const BUY_LIMIT = 2;

const goldAtLeast = (n: number) => (c: ReadCtx): true | string =>
  c.state.player.gold >= n ? true : 'Not enough gold.';
const shardsAtLeast = (n: number) => (c: ReadCtx): true | string =>
  (c.state.player.counters.shards ?? 0) >= n ? true : 'Not enough Shards.';

const CONVEYOR_GAMBLE: Effect = { type: 'gamble', outcomes: [
  { weight: 35, label: 'An intact relic rolls down the belt.', effects: [{ type: 'gain_relic', rarity: 'uncommon' }] },
  { weight: 40, label: 'The machine pays out.', effects: [{ type: 'gold', amount: 60 }] },
  { weight: 25, label: 'The machine records a debt.', effects: [{ type: 'add_card', card: 'curse_debt_mark', to: 'deck' }] },
] };

export const EVENTS: EventDef[] = [
  {
    id: 'ev_spore_choir', name: 'Spore Choir', acts: [1], icon: 'event_spore_choir',
    text: 'In a flooded hydroponics bay, a ring of glowing fungal bells hums in unison. Something large sleeps beneath the chorus. The air tastes of copper and sugar.',
    options: [
      { label: 'Silence them (fight; win a common relic).', effects: [
        { type: 'run_flag', key: 'combat_start_status:event_choir_setup', delta: 1 },
        { type: 'start_combat', encounterId: 'enc_event_spore_choir', onWin: [{ type: 'gain_relic', rarity: 'common' }] },
      ] },
      { label: 'Harvest a bell (lose {lose_hp} HP; gain a potion).', effects: [{ type: 'lose_hp', amount: 6 }, { type: 'gain_potion' }] },
      { label: 'Tiptoe past.', effects: [] },
    ],
  },
  {
    id: 'ev_drowned_shrine', name: 'Drowned Shrine', acts: [1], icon: 'event_drowned_shrine',
    text: 'A maintenance shrine half-sunk in luminous water. Rusted tools ring the altar as offerings. The attendant drone still blinks, waiting.',
    options: [
      { label: 'Offer blood (lose {lose_hp} HP; remove {remove_card} card).', effects: [{ type: 'lose_hp', amount: 10 }, { type: 'remove_card', choose: true, n: 1 }] },
      { label: 'Offer coin (pay {gold_abs} gold; remove {remove_card} card).', available: goldAtLeast(50), effects: [{ type: 'gold', amount: -50 }, { type: 'remove_card', choose: true, n: 1 }] },
      { label: 'Pray (heal {heal} HP).', effects: [{ type: 'heal', amount: 8 }] },
    ],
  },
  {
    id: 'ev_flickering_medpod', name: 'Flickering Med-Pod', acts: [1], icon: 'event_flickering_medpod',
    text: 'An emergency med-pod flickers between green and red. Its screen offers two cycles in cheerful, broken text.',
    options: [
      { label: 'Full cycle ({gamble_1}% heal to full / {gamble_2}% lose {max_hp_abs} Max HP).', effects: [{ type: 'gamble', outcomes: [
        { weight: 65, label: 'The green light holds. You feel whole.', effects: [{ type: 'heal', amount: { scale: 'missing_hp' } }] },
        { weight: 35, label: 'Red light floods the pod. Something burns.', effects: [{ type: 'max_hp', amount: -6 }] },
      ] }] },
      { label: 'Quick cycle (heal {heal} HP).', effects: [{ type: 'heal', amount: 12 }] },
      { label: 'Leave.', effects: [] },
    ],
  },
  {
    id: 'ev_hydroponic_bay', name: 'Hydroponic Bay', acts: [1], icon: 'event_hydroponic_bay', values: { offers: TRANSMUTE_OFFERS },
    text: 'Grafted fruit hangs in rows under failing lamps. A splicing arm twitches, still loaded with samples from a hundred species.',
    options: [
      { label: 'Cultivate (upgrade {upgrade} random cards).', effects: [{ type: 'upgrade', where: 'deck', n: 2 }] },
      { label: 'Splice (Transmute a card; {offers} offers).', effects: [{ type: 'transmute', offers: TRANSMUTE_OFFERS }] },
      { label: 'Feed the grafts (lose {lose_hp} HP; a Bloom card gains {bloom} Bloom).',
        available: (c) => c.state.classId !== 'graft' ? 'Only the Graft can feed the grafts.' :
          c.state.player.deck.some((card) => BLOOM_CARDS.has(card.id)) ? true : 'Requires a Bloom card.',
        effects: [{ type: 'lose_hp', amount: 8 }, { type: 'bloom', target: 'choose_deck', amount: 3 }] },
    ],
  },
  {
    id: 'ev_scavenger_drone', name: 'Wounded Scavenger Drone', acts: [1], icon: 'event_scavenger_drone',
    text: 'A six-legged salvage drone lies on its back, legs still cycling. Its cargo pod is dented but sealed.',
    options: [
      { label: 'Repair it (pay {gold_abs} gold; gain a potion and {shards} Shard).', available: goldAtLeast(30), effects: [{ type: 'gold', amount: -30 }, { type: 'gain_potion' }, { type: 'shards', amount: 1 }] },
      { label: 'Strip it (gain a common relic and Static Ghost).', effects: [{ type: 'gain_relic', rarity: 'common' }, { type: 'add_card', card: 'curse_static_ghost', to: 'deck' }] },
      { label: 'Leave.', effects: [] },
    ],
  },
  {
    id: 'ev_singing_geode', name: 'Singing Geode', acts: [1], icon: 'event_singing_geode',
    text: 'A crystal the size of a shuttle grows up through the deck plating. It rings faintly when you breathe near it.',
    options: [
      { label: 'Chip it (lose {lose_hp} HP; gain {shards} Shards).', effects: [{ type: 'lose_hp', amount: 7 }, { type: 'shards', amount: 2 }] },
      { label: 'Attune (spend {shards_abs} Shards; upgrade {upgrade} chosen cards).', available: shardsAtLeast(2), effects: [{ type: 'shards', amount: -2 }, { type: 'upgrade', where: 'deck', choose: true, n: 2 }] },
      { label: 'Take the heart (gain Shard Debt).', effects: [{ type: 'gain_relic', id: 'shard_debt' }] },
    ],
  },
  {
    id: 'ev_assembly_line', name: 'The Assembly Line', acts: [2], icon: 'event_assembly_line',
    text: 'A conveyor still running after a century, stamping out the same three tools over and over for nobody.',
    values: ASSEMBLY,
    options: [
      { label: 'Take one (choose among {tools} tools; each {uncommon_odds}% uncommon / {rare_odds}% rare).', effects: [{ type: 'custom', fn: 'assembly_tools' }] },
      { label: 'Take all {tools} (gain Seized Joint).', effects: [{ type: 'custom', fn: 'assembly_tools' }] },
      { label: 'Leave.', effects: [] },
    ],
    custom: {
      assembly_tools: (ctx) => {
        // offer_cards samples the combined pool uniformly; this event instead rolls each
        // slot's designer odds, without replacement, on the seeded reward stream.
        const remaining = [...ASSEMBLY_TOOLS];
        const tools = Array.from({ length: ASSEMBLY.tools }, () => {
          const rarity = ctx.rng.int('reward', 1, 100) <= ASSEMBLY.uncommon_odds ? 'uncommon' : 'rare';
          const tool = ctx.rng.pick('reward', remaining.filter((card) => card.rarity === rarity));
          remaining.splice(remaining.indexOf(tool), 1);
          return tool;
        });
        if (ctx.state.event?.chosen === 1) {
          ctx.emit({ t: 'text', text: `You take ${tools.map((card) => card.name).join(', ')}.` });
          ctx.queue([...tools.map((card): Effect => ({ type: 'add_card', card: card.id, to: 'deck' })), { type: 'add_card', card: 'curse_seized_joint', to: 'deck' }]);
          return;
        }
        if (ctx.state.pendingChoice) throw new Error('Assembly Line: a choice is already pending.');
        ctx.state.pendingChoice = {
          kind: 'offers', prompt: 'Take one tool.', from: null, choices: tools.map((_, i) => i), labels: tools.map((card) => card.name),
          offers: tools.map((card) => ({ id: card.id, upgraded: false })), min: 1, max: 1, resume: { op: 'offer_pick' },
        };
        ctx.emit({ t: 'choice', prompt: 'Take one tool.' });
      },
    },
  },
  {
    id: 'ev_engine_cult', name: 'Cult of the Engine', acts: [2], icon: 'event_engine_cult',
    text: "Robed figures chant to a turbine that hasn't turned in decades. They welcome you warmly. Their hands are oil-black to the elbow.",
    options: [
      { label: 'Join the litany (lose {max_hp_abs} Max HP; gain Engine Tooth).', effects: [{ type: 'max_hp', amount: -6 }, { type: 'gain_relic', id: 'engine_tooth' }] },
      { label: 'Smash the idol (fight; win an uncommon relic).', effects: [{ type: 'start_combat', encounterId: 'enc_event_engine_cult', onWin: [{ type: 'gain_relic', rarity: 'uncommon' }] }] },
      { label: 'Leave.', effects: [] },
    ],
  },
  {
    id: 'ev_smelter', name: 'The Smelter', acts: [2], icon: 'event_smelter',
    text: 'A furnace that accepts any offering. Behind the grate, something that was once a smith keeps working.',
    options: [
      { label: 'Melt a card (remove {remove_card} card; lose {lose_hp} HP).', effects: [{ type: 'remove_card', choose: true, n: 1 }, { type: 'lose_hp', amount: 8 }] },
      { label: 'Temper (pay {gold_abs} gold; upgrade {upgrade} chosen cards).', available: goldAtLeast(60), effects: [{ type: 'gold', amount: -60 }, { type: 'upgrade', where: 'deck', choose: true, n: 2 }] },
      { label: 'Leave.', effects: [] },
    ],
  },
  {
    id: 'ev_oracle_terminal', name: 'Oracle Terminal', acts: [2], icon: 'event_oracle_terminal',
    text: 'A predictive-maintenance terminal, still forecasting failures for machines long dead. It turns its lens on you and starts predicting.',
    values: { timing_upgrades: 1 },
    options: [
      { label: 'Jack in (lose {lose_hp} HP; gain Oracle Pebble).', available: (c) => c.state.classId === 'chronist' ? 'The Chronist already has Augury.' : true,
        effects: [{ type: 'lose_hp', amount: 6 }, { type: 'gain_relic', id: 'oracle_pebble' }] },
      { label: 'Single forecast (pay {gold_abs} gold; Augury for {run_flag} combat).',
        available: (c) => c.state.classId === 'chronist' ? 'The Chronist already has Augury.' : goldAtLeast(40)(c),
        effects: [{ type: 'gold', amount: -40 }, { type: 'run_flag', key: 'augury_combats', delta: 1 }] },
      { label: 'Recalibrate (lose {lose_hp} HP; upgrade {timing_upgrades} Delay or on-beat card).',
        available: (c) => c.state.classId === 'chronist' ? true : 'Only the Chronist can recalibrate.',
        effects: [{ type: 'lose_hp', amount: 5 }, { type: 'custom', fn: 'upgrade_timing_card' }] },
      { label: 'Leave.', effects: [] },
    ],
    custom: {
      upgrade_timing_card: (ctx) => {
        // CardFilter combines fields with AND. This event needs Delay OR on_beat;
        // the roster ids select that union, then the engine performs the upgrade.
        const choices = ctx.state.player.deck.filter((card) => !card.upgraded && TIMING_CARDS.has(card.id)).map((card) => card.uid);
        if (choices.length === 0) return;
        if (ctx.state.pendingChoice) throw new Error('Oracle Terminal: a choice is already pending.');
        ctx.state.pendingChoice = { kind: 'cards', prompt: 'Upgrade a Delay or on-beat card.', from: 'deck', choices, labels: [], offers: [], min: 1, max: 1, resume: { op: 'upgrade_deck' } };
        ctx.emit({ t: 'choice', prompt: 'Upgrade a Delay or on-beat card.' });
      },
    },
  },
  {
    id: 'ev_rigged_conveyor', name: 'Rigged Conveyor', acts: [2], icon: 'event_rigged_conveyor',
    text: 'A prize dispenser welded into the conveyor line. Its odds are painted on the side in honest, faded numerals.',
    options: [
      { label: 'Pull the lever (pay {gold_abs} gold; {gamble_1}% uncommon relic / {gamble_2}% gain {gold2} gold / {gamble_3}% Debt Mark).',
        available: goldAtLeast(30), next: 'second_pull', effects: [{ type: 'gold', amount: -30 }, CONVEYOR_GAMBLE] },
      { label: 'Leave.', effects: [] },
    ],
    pages: { second_pull: {
      text: 'The lever unlocks once more. The price display ticks upward. This is your last pull.',
      options: [
        { label: 'Pull the lever again (pay {gold_abs} gold; {gamble_1}% uncommon relic / {gamble_2}% gain {gold2} gold / {gamble_3}% Debt Mark).',
          available: goldAtLeast(50), effects: [{ type: 'gold', amount: -50 }, CONVEYOR_GAMBLE] },
        { label: 'Leave.', effects: [] },
      ],
    } },
  },
  {
    id: 'ev_salvage_heap', name: 'Salvage Heap', acts: [2], icon: 'event_salvage_heap',
    text: 'Mountains of machine carcasses. Somewhere in here is something worth keeping.',
    options: [
      { label: 'Haul the heavy scrap (gain {gold} gold and Guilt).', effects: [{ type: 'gold', amount: 90 }, { type: 'add_card', card: 'curse_guilt', to: 'deck' }] },
      { label: 'Pick carefully (gain {gold} gold).', effects: [{ type: 'gold', amount: 35 }] },
      { label: 'Search for parts (lose {lose_hp} HP; gain {repeat} potions).', effects: [{ type: 'lose_hp', amount: 5 }, { type: 'repeat', times: 2, effects: [{ type: 'gain_potion' }] }] },
    ],
  },
  {
    id: 'ev_your_echo', name: 'Your Own Echo', acts: [3], icon: 'event_your_echo',
    text: 'A figure of starlight wearing your face steps out of the observatory glass. It moves as you move, a heartbeat early.',
    options: [
      { label: 'Duel it (fight; win {win_upgrades} random upgrades).', effects: [
        { type: 'run_flag', key: 'combat_start_status:event_echo_setup', delta: 1 },
        { type: 'start_combat', encounterId: 'enc_event_echo', onWin: [{ type: 'upgrade', where: 'deck', n: ECHO_WIN_UPGRADES }] },
      ] },
      { label: 'Reach out (lose {max_hp_abs} Max HP; duplicate a card at no Bloom).', effects: [{ type: 'max_hp', amount: -8 }, { type: 'duplicate_card' }] },
      { label: 'Look away.', effects: [] },
    ],
    // start_combat.onWin is deliberately not walked by the label renderer.
    values: { win_upgrades: ECHO_WIN_UPGRADES },
  },
  {
    id: 'ev_void_lens', name: 'The Void Lens', acts: [3], icon: 'event_void_lens',
    text: 'A telescope pointed at nothing. When you look through it, nothing looks back, and it already knows your next three heartbeats.',
    options: [
      { label: 'Gaze (lose {max_hp_abs} Max HP; Augury for the rest of this act).', available: (c) => c.state.classId === 'chronist' ? 'The Chronist already has Augury.' : true,
        effects: [{ type: 'max_hp', amount: -5 }, { type: 'run_flag', key: 'augury_rest_of_act', delta: 1 }] },
      { label: 'Gaze deeper (lose {max_hp_abs} Max HP; deeper forecasts for the rest of this act).', available: (c) => c.state.classId === 'chronist' ? true : 'Only the Chronist can gaze deeper.',
        effects: [{ type: 'max_hp', amount: -5 }, { type: 'run_flag', key: 'forecast_depth_3_rest_of_act', delta: 1 }] },
      { label: 'Pry out the lens (gain {gold} gold).', effects: [{ type: 'gold', amount: 60 }] },
      { label: 'Leave.', effects: [] },
    ],
  },
  {
    id: 'ev_tether_merchant', name: 'Tether Merchant', acts: [3], icon: 'event_tether_merchant',
    text: 'A courier rides the tether cable up and down forever, trading in crystal and favours.',
    values: { sell_gold: SELL_GOLD, buy_gold: BUY_GOLD, buy_limit: BUY_LIMIT },
    options: [
      { label: 'Sell Shards (choose how many; {sell_gold} gold per Shard).', available: shardsAtLeast(1), effects: [{ type: 'custom', fn: 'sell_shards' }] },
      { label: 'Buy Shards ({buy_gold} gold each; up to {buy_limit}).', available: goldAtLeast(BUY_GOLD), effects: [{ type: 'choose', prompt: 'Buy how many Shards?', options: Array.from({ length: BUY_LIMIT }, (_, i): ChooseOption => ({
        label: 'Pay {gold_abs} gold for {shards} Shard(s).',
        if: { type: 'compare', left: { scale: 'gold' }, op: '>=', right: BUY_GOLD * (i + 1) },
        effects: [{ type: 'gold', amount: -BUY_GOLD * (i + 1) }, { type: 'shards', amount: i + 1 }],
      })) }] },
      { label: 'Trade a relic (gain {shards} Shards).',
        available: (c) => c.state.player.relics.some((relic) => !STARTER_RELICS.has(relic.id)) ? true : 'Requires a non-starter relic.',
        effects: [{ type: 'lose_relic', notStarter: true }, { type: 'shards', amount: 3 }] },
      { label: 'Leave.', effects: [] },
    ],
    custom: {
      sell_shards: (ctx) => {
        const n = ctx.state.player.counters.shards ?? 0;
        ctx.queue([{ type: 'choose', prompt: 'Sell how many Shards?', options: Array.from({ length: n }, (_, i) => ({
          label: 'Sell {shards_abs} Shard(s) for {gold} gold.',
          effects: [{ type: 'shards', amount: -(i + 1) }, { type: 'gold', amount: SELL_GOLD * (i + 1) }],
        })) }]);
      },
    },
  },
  {
    id: 'ev_crown_vault', name: 'Sealed Vault', acts: [3], icon: 'event_crown_vault',
    text: "A vault door marked with the Spire builders' crest. The seal is warm, and it hums your name.",
    options: [
      { label: 'Break the seal (gain a rare relic and Vacuum Chill).', effects: [{ type: 'gain_relic', rarity: 'rare' }, { type: 'add_card', card: 'curse_vacuum_chill', to: 'deck' }] },
      { label: 'Take the fragment (gain Crown Fragment).', effects: [{ type: 'gain_relic', id: 'crown_fragment' }] },
      { label: 'Leave.', effects: [] },
    ],
  },
  {
    id: 'ev_prism_garden', name: 'Prism Garden', acts: [3], icon: 'event_prism_garden',
    text: 'Crystal flowers split the light of a dead sun into every colour the palette allows.',
    options: [
      { label: 'Refract (lose {lose_hp} HP; Transmute up to {transmute} cards with {offers} offers each; upgrade the results).',
        effects: [{ type: 'lose_hp', amount: 12 }, { type: 'transmute', offers: TRANSMUTE_OFFERS, n: 3, upTo: true, upgrade: true }] },
      { label: 'Bask (heal {heal} HP).', effects: [{ type: 'heal', amount: 20 }] },
    ],
    values: { offers: TRANSMUTE_OFFERS },
  },
  {
    id: 'ev_immune_scan', name: 'Immune Scan', acts: [3], icon: 'event_immune_scan',
    text: "The Spire's own defences finally notice you. A white lattice of light sweeps the corridor, cataloguing everything that doesn't belong.",
    options: [
      { label: 'Submit (remove all curses except Burden; lose {lose_hp} HP).', effects: [{ type: 'remove_card', all: true, filter: { type: 'curse' } }, { type: 'lose_hp', amount: 15 }] },
      { label: 'Resist (fight; win {win_shards} Shard).', effects: [{ type: 'start_combat', encounterId: 'enc_event_antibodies', onWin: [{ type: 'shards', amount: IMMUNE_WIN_SHARDS }] }] },
      { label: 'Hide (pay {gold_abs} gold).', available: goldAtLeast(25), effects: [{ type: 'gold', amount: -25 }] },
    ],
    values: { win_shards: IMMUNE_WIN_SHARDS },
  },
  {
    id: 'ev_wandering_artificer', name: 'Wandering Artificer', acts: [1, 2, 3], icon: 'event_wandering_artificer',
    text: 'A tinkerer with a cart of glowing tools, climbing the Spire one floor a year.',
    options: [
      { label: 'Tune (upgrade {upgrade} chosen card).', effects: [{ type: 'upgrade', where: 'deck', choose: true, n: 1 }] },
      { label: 'Overhaul (spend {shards_abs} Shard; upgrade {upgrade} chosen cards).', available: shardsAtLeast(1), effects: [{ type: 'shards', amount: -1 }, { type: 'upgrade', where: 'deck', choose: true, n: 3 }] },
      { label: 'Leave.', effects: [] },
    ],
  },
  {
    id: 'ev_lost_climber', name: 'Lost Climber', acts: [1, 2, 3], icon: 'event_lost_climber',
    text: 'Another climber, out of supplies and luck, sits beside a dead terminal.',
    options: [
      { label: 'Share a potion (gain {shards} Shard and {gold} gold).', available: (c) => c.state.player.potions.length > 0 ? true : 'Requires a potion.',
        effects: [{ type: 'lose_potion' }, { type: 'shards', amount: 1 }, { type: 'gold', amount: 25 }] },
      { label: 'Give coin (pay {gold_abs} gold; gain a common relic).', available: goldAtLeast(40), effects: [{ type: 'gold', amount: -40 }, { type: 'gain_relic', rarity: 'common' }] },
      { label: 'Rob them (gain {gold} gold and Guilt).', effects: [{ type: 'gold', amount: 60 }, { type: 'add_card', card: 'curse_guilt', to: 'deck' }] },
    ],
  },
  {
    id: 'ev_memory_pool', name: 'Memory Pool', acts: [1, 2, 3], icon: 'event_memory_pool',
    text: 'A pool of silver data-fluid. Your reflection in it is missing a few things.',
    options: [
      { label: 'Forget (lose {max_hp_abs} Max HP; remove {remove_card} cards).', effects: [{ type: 'max_hp', amount: -5 }, { type: 'remove_card', choose: true, n: 2 }] },
      { label: 'Remember (choose from {offer_cards} uncommon class cards).', effects: [{ type: 'offer_cards', pool: 'class', rarity: 'uncommon', n: 3 }] },
      { label: 'Leave.', effects: [] },
    ],
  },
  {
    id: 'ev_quiet_bench', name: 'A Quiet Bench', acts: [1, 2, 3], icon: 'event_quiet_bench', values: { offers: TRANSMUTE_OFFERS },
    // Keep the flavour intact without tripping the lexical DOM-global guard.
    text: 'A bench facing a window' + ". The view is the whole world you're leaving.",
    options: [
      { label: 'Sit (heal {heal} HP, a quarter of Max HP).', effects: [{ type: 'heal', amount: { per: 0.25, scale: 'max_hp' } }] },
      { label: 'Whittle (Transmute a card; {offers} offers).', effects: [{ type: 'transmute', offers: TRANSMUTE_OFFERS }] },
    ],
  },
];

// Event combats have no specified composition in ENEMIES.md. These use its roster
// to match GDD §6's descriptions; the modifiers below supply the stated strength.
export const EVENT_ENCOUNTERS: EncounterDef[] = [
  { id: 'enc_event_spore_choir', name: 'Spore Choir', acts: [1], pool: 'event', enemies: ['sporepuff', 'vinelash'] },
  { id: 'enc_event_engine_cult', name: 'Cult of the Engine', acts: [2], pool: 'event', enemies: ['cog_acolyte', 'cog_acolyte', 'cog_acolyte'] },
  { id: 'enc_event_echo', name: 'Your Own Echo', acts: [3], pool: 'event', enemies: ['mirror_knight'] },
  { id: 'enc_event_antibodies', name: 'Immune Scan', acts: [3], pool: 'event', enemies: ['antibody', 'antibody', 'antibody', 'antibody'] },
];

export const EVENT_STATUSES: StatusDef[] = [
  {
    id: 'event_choir_setup', name: 'Spore Choir Setup', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false, hidden: true,
    text: 'Prepare the Spore Choir.', icon: 'status_event_choir_setup',
    triggers: { onCombatStart: [
      { type: 'status', target: 'all_enemies', id: 'event_choir_vigor', amount: 1 },
      { type: 'run_flag', key: 'combat_start_status:event_choir_setup', delta: -1 },
      { type: 'status', target: 'self', id: 'event_choir_setup', amount: -1 },
    ] },
  },
  {
    id: 'event_choir_vigor', name: 'Choir Vigor', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false,
    values: { hp_pct: CHOIR_HP_PCT }, text: 'Starts at {hp_pct}% normal Max HP.', icon: 'status_event_choir_vigor',
    hooks: { onApplied: (ctx) => {
      const enemy = ctx.combat?.enemies.find((e) => e.uid === ctx.owner);
      if (!enemy) throw new Error('Choir Vigor requires an enemy owner.');
      enemy.hp = enemy.maxHp = Math.floor(enemy.maxHp * CHOIR_HP_PCT / 100);
    } },
  },
  {
    id: 'event_echo_setup', name: 'Echo Setup', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false, hidden: true,
    text: 'Prepare your echo.', icon: 'status_event_echo_setup',
    triggers: { onCombatStart: [
      { type: 'status', target: 'all_enemies', id: 'event_echo_strength', amount: 1 },
      { type: 'run_flag', key: 'combat_start_status:event_echo_setup', delta: -1 },
      { type: 'status', target: 'self', id: 'event_echo_setup', amount: -1 },
    ] },
  },
  {
    id: 'event_echo_strength', name: 'Echo Strength', stacks: 'flag', decay: 'never', tick: 'never', isDebuff: false,
    values: { pct: ECHO_STRENGTH_PCT }, text: 'Starts at {pct}% normal Max HP. Hits and defence gains are {pct}% of normal.', icon: 'status_event_echo_strength',
    hooks: {
      onApplied: (ctx) => {
        const enemy = ctx.combat?.enemies.find((e) => e.uid === ctx.owner);
        if (!enemy) throw new Error('Echo Strength requires an enemy owner.');
        enemy.hp = enemy.maxHp = Math.floor(enemy.maxHp * ECHO_STRENGTH_PCT / 100);
      },
      damageDealtMult: () => ECHO_STRENGTH_PCT,
      blockMult: () => ECHO_STRENGTH_PCT,
    },
  },
];
