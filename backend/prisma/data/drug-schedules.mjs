// Prescription classification for the seeded Indian medicine catalogue.
//
// The source CSV (indian_medicine_data.csv) has no "prescription required"
// column - its `type` field is always the literal string "allopathy". The only
// usable signal is the active ingredient(s) in short_composition1 / short_composition2.
//
// In India, whether a medicine may be sold only against a prescription is
// governed by the schedules of the Drugs and Cosmetics Rules, keyed to the drug
// substance (not the brand):
//
//   H   - Prescription drug. Retail sale only against a registered practitioner's
//         prescription. Covers most antibiotics, cardiovascular drugs, oral
//         antidiabetics, systemic corticosteroids, hormones, etc.
//   H1  - Prescription drug with extra controls: the pharmacist must record the
//         prescriber, patient and quantity in a separate register. Covers third
//         and higher generation antibiotics, anti-TB drugs, and habit-forming
//         drugs such as tramadol and the benzodiazepines.
//   X   - Narcotic / psychotropic. Needs a special licence, the prescription is
//         retained by the pharmacy, and refills are barred. Barbiturates,
//         amphetamine-type stimulants, ketamine, etc.
//
// Anything not on a schedule is treated as over the counter (OTC): common
// analgesics, most antihistamines, antacids/H2 blockers, vitamins and minerals,
// oral rehydration salts, simple cough expectorants.
//
// A medicine is PRESCRIPTION if ANY of its active ingredients is on schedule
// H, H1 or X. This table is a curated list of drug substances - about 400
// entries - chosen to cover the overwhelming majority of rows in the dataset.
// Both British and US spellings are included as separate keys where they differ
// (e.g. "amoxycillin" / "amoxicillin").

/** @typedef {'H' | 'H1' | 'X' | 'OTC'} Schedule */

// Counter-ion, hydrate and ester tokens that are stripped from the end (and
// start) of a normalised ingredient so that, for example, "Chlorpheniramine
// Maleate" and "Amoxycillin Trihydrate" collapse to their base drug name.
const AFFIX_TOKENS = new Set([
  'hydrochloride', 'hcl', 'dihydrochloride', 'hydrobromide', 'hbr', 'bromide',
  'chloride', 'iodide', 'saccharate', 'edetate', 'edisylate', 'napsylate',
  'sodium', 'potassium', 'calcium', 'magnesium', 'zinc', 'lithium',
  'maleate', 'sulphate', 'sulfate', 'bisulphate', 'phosphate', 'diphosphate',
  'hemisuccinate', 'succinate', 'besylate', 'besilate', 'mesylate', 'mesilate',
  'citrate', 'dicitrate', 'hydrogen', 'tartrate', 'bitartrate', 'fumarate',
  'acetate', 'diacetate', 'propionate', 'dipropionate', 'valerate', 'furoate',
  'nitrate', 'mononitrate', 'dinitrate', 'gluconate', 'lactobionate', 'lactate',
  'stearate', 'palmitate', 'pamoate', 'embonate', 'oxalate', 'malate', 'orotate',
  'aspartate', 'pivoxil', 'proxetil', 'axetil', 'medoxomil', 'cilexetil',
  'trihydrate', 'dihydrate', 'monohydrate', 'hemihydrate', 'sesquihydrate',
  'hydrate', 'anhydrous', 'micronized', 'micronised', 'base', 'salt', 'as',
  'xinafoate', 'fluticasone', 'dipivoxil', 'etexilate', 'tosylate', 'tosilate',
  'napadisylate', 'teoclate', 'hippurate', 'undecylenate', 'enantate',
  'enanthate', 'decanoate', 'phenylpropionate', 'cypionate', 'caproate',
]);

/** @type {Record<string, Schedule>} */
const SCHEDULE_BY_SALT = {
  // --- Beta-lactam antibiotics ------------------------------------------------
  amoxycillin: 'H1', amoxicillin: 'H1', ampicillin: 'H1', cloxacillin: 'H1',
  dicloxacillin: 'H1', flucloxacillin: 'H1', 'benzylpenicillin': 'H1',
  'phenoxymethylpenicillin': 'H1', 'penicillin g': 'H1', 'penicillin v': 'H1',
  piperacillin: 'H1', ticarcillin: 'H1', carbenicillin: 'H1', nafcillin: 'H1',
  'clavulanic acid': 'H1', clavulanate: 'H1', sulbactam: 'H1', tazobactam: 'H1',
  avibactam: 'H1',
  cefadroxil: 'H1', cephalexin: 'H1', cefalexin: 'H1', cefazolin: 'H1',
  cephazolin: 'H1', cefaclor: 'H1', cefuroxime: 'H1', cefprozil: 'H1',
  cefixime: 'H1', cefpodoxime: 'H1', cefdinir: 'H1', cefditoren: 'H1',
  ceftibuten: 'H1', cefetamet: 'H1', ceftriaxone: 'H1', cefotaxime: 'H1',
  ceftazidime: 'H1', cefoperazone: 'H1', cefepime: 'H1', cefpirome: 'H1',
  ceftaroline: 'H1', cephradine: 'H1', cefroxadine: 'H1', 'cefuroxime axetil': 'H1',
  ceftazidime_avibactam: 'H1', cefdinir_probenecid: 'H1',
  meropenem: 'H1', imipenem: 'H1', ertapenem: 'H1', doripenem: 'H1',
  faropenem: 'H1', cilastatin: 'H1', aztreonam: 'H1',

  // --- Macrolides, lincosamides, others -------------------------------------
  azithromycin: 'H1', clarithromycin: 'H1', erythromycin: 'H', roxithromycin: 'H1',
  spiramycin: 'H1', josamycin: 'H1', telithromycin: 'H1', fidaxomicin: 'H1',
  clindamycin: 'H1', lincomycin: 'H1',
  vancomycin: 'H1', teicoplanin: 'H1', linezolid: 'H1', tedizolid: 'H1',
  daptomycin: 'H1', 'colistin': 'H1', colistimethate: 'H1', 'polymyxin b': 'H1',
  fosfomycin: 'H1', chloramphenicol: 'H', 'fusidic acid': 'H', 'sodium fusidate': 'H',
  mupirocin: 'H', retapamulin: 'H', rifaximin: 'H', spectinomycin: 'H1',

  // --- Fluoroquinolones ----------------------------------------------------
  ciprofloxacin: 'H1', ofloxacin: 'H1', levofloxacin: 'H1', moxifloxacin: 'H1',
  gatifloxacin: 'H1', sparfloxacin: 'H1', norfloxacin: 'H1', lomefloxacin: 'H1',
  prulifloxacin: 'H1', gemifloxacin: 'H1', nadifloxacin: 'H1', besifloxacin: 'H1',
  pefloxacin: 'H1', 'nalidixic acid': 'H', finafloxacin: 'H1',

  // --- Aminoglycosides & tetracyclines -----------------------------------
  gentamicin: 'H', amikacin: 'H1', tobramycin: 'H1', netilmicin: 'H1',
  streptomycin: 'H1', kanamycin: 'H1', neomycin: 'H', framycetin: 'H',
  paromomycin: 'H',
  doxycycline: 'H', minocycline: 'H', tetracycline: 'H', tigecycline: 'H1',
  demeclocycline: 'H', oxytetracycline: 'H', eravacycline: 'H1',

  // --- Sulphonamides, nitroimidazoles, misc antibacterials -------------
  sulfamethoxazole: 'H', sulphamethoxazole: 'H', trimethoprim: 'H',
  cotrimoxazole: 'H', 'co-trimoxazole': 'H', sulfadiazine: 'H', sulphadiazine: 'H',
  sulfacetamide: 'H', dapsone: 'H',
  metronidazole: 'H', tinidazole: 'H', ornidazole: 'H', secnidazole: 'H',
  satranidazole: 'H', nitrofurantoin: 'H', nitazoxanide: 'H',

  // --- Anti-tuberculars --------------------------------------------------
  rifampicin: 'H1', rifampin: 'H1', rifabutin: 'H1', isoniazid: 'H1',
  pyrazinamide: 'H1', ethambutol: 'H1', bedaquiline: 'H1', delamanid: 'H1',
  cycloserine: 'H1', ethionamide: 'H1', prothionamide: 'H1', clofazimine: 'H1',
  capreomycin: 'H1', 'para-aminosalicylic acid': 'H1', 'aminosalicylic acid': 'H1',
  pretomanid: 'H1',

  // --- Systemic antifungals -------------------------------------------
  fluconazole: 'H', itraconazole: 'H', ketoconazole: 'H', voriconazole: 'H',
  posaconazole: 'H', isavuconazole: 'H', isavuconazonium: 'H', terbinafine: 'H',
  griseofulvin: 'H', 'amphotericin b': 'H', amphotericin: 'H', caspofungin: 'H',
  micafungin: 'H', anidulafungin: 'H', flucytosine: 'H', hamycin: 'H',

  // --- Antivirals ----------------------------------------------------
  acyclovir: 'H', aciclovir: 'H', valacyclovir: 'H', valaciclovir: 'H',
  famciclovir: 'H', ganciclovir: 'H', valganciclovir: 'H', oseltamivir: 'H',
  zanamivir: 'H', baloxavir: 'H', ribavirin: 'H', entecavir: 'H', tenofovir: 'H',
  'tenofovir alafenamide': 'H', 'tenofovir disoproxil': 'H', adefovir: 'H',
  lamivudine: 'H', zidovudine: 'H', abacavir: 'H', emtricitabine: 'H',
  efavirenz: 'H', nevirapine: 'H', rilpivirine: 'H', etravirine: 'H',
  dolutegravir: 'H', raltegravir: 'H', bictegravir: 'H', elvitegravir: 'H',
  lopinavir: 'H', ritonavir: 'H', atazanavir: 'H', darunavir: 'H',
  remdesivir: 'H1', favipiravir: 'H1', molnupiravir: 'H1', nirmatrelvir: 'H1',
  sofosbuvir: 'H', daclatasvir: 'H', ledipasvir: 'H', velpatasvir: 'H',
  'declatasvir': 'H', letermovir: 'H',

  // --- Antimalarials & antiprotozoals -------------------------------
  chloroquine: 'H', hydroxychloroquine: 'H', artemether: 'H', lumefantrine: 'H',
  artesunate: 'H', arteether: 'H', 'alpha beta arteether': 'H', artemisinin: 'H',
  mefloquine: 'H', primaquine: 'H', quinine: 'H', 'atovaquone': 'H',
  proguanil: 'H', pyrimethamine: 'H', sulfadoxine: 'H', sulphadoxine: 'H',
  piperaquine: 'H', tafenoquine: 'H', 'diethylcarbamazine': 'H', ivermectin: 'H',
  'sodium stibogluconate': 'H', miltefosine: 'H', pentamidine: 'H',
  'diloxanide furoate': 'H', diloxanide: 'H',

  // --- Cardiovascular: calcium channel & RAAS ----------------------
  amlodipine: 'H', nifedipine: 'H', felodipine: 'H', cilnidipine: 'H',
  benidipine: 'H', lercanidipine: 'H', nimodipine: 'H', lacidipine: 'H',
  nitrendipine: 'H', 'levamlodipine': 'H', 'amlodipine besylate': 'H',
  telmisartan: 'H', losartan: 'H', olmesartan: 'H', valsartan: 'H',
  irbesartan: 'H', candesartan: 'H', azilsartan: 'H', 'sacubitril': 'H',
  ramipril: 'H', enalapril: 'H', lisinopril: 'H', perindopril: 'H',
  captopril: 'H', benazepril: 'H', fosinopril: 'H', trandolapril: 'H',
  imidapril: 'H', 'zofenopril': 'H',

  // --- Cardiovascular: beta-blockers, diuretics, other antihypertensives ---
  atenolol: 'H', metoprolol: 'H', bisoprolol: 'H', nebivolol: 'H',
  carvedilol: 'H', propranolol: 'H', labetalol: 'H', esmolol: 'H', sotalol: 'H',
  betaxolol: 'H', celiprolol: 'H',
  hydrochlorothiazide: 'H', chlorthalidone: 'H', chlortalidone: 'H',
  indapamide: 'H', metolazone: 'H', furosemide: 'H', frusemide: 'H',
  torsemide: 'H', torasemide: 'H', bumetanide: 'H', spironolactone: 'H',
  eplerenone: 'H', amiloride: 'H', 'clonidine': 'H', methyldopa: 'H',
  prazosin: 'H', terazosin: 'H', doxazosin: 'H', hydralazine: 'H',
  minoxidil: 'H', 'sodium nitroprusside': 'H',
  ivabradine: 'H', ranolazine: 'H', trimetazidine: 'H', nicorandil: 'H',
  'isosorbide mononitrate': 'H', 'isosorbide dinitrate': 'H', nitroglycerin: 'H',
  'glyceryl trinitrate': 'H',
  bosentan: 'H', ambrisentan: 'H', macitentan: 'H', riociguat: 'H',
  sildenafil: 'H', tadalafil: 'H', vardenafil: 'H', avanafil: 'H', 'udenafil': 'H',

  // --- Cardiovascular: antiarrhythmics, glycosides ---------------------
  amiodarone: 'H', dronedarone: 'H', flecainide: 'H', propafenone: 'H',
  mexiletine: 'H', dofetilide: 'H', digoxin: 'H', 'digoxin ': 'H',

  // --- Lipid-lowering ------------------------------------------------
  atorvastatin: 'H', rosuvastatin: 'H', simvastatin: 'H', pravastatin: 'H',
  pitavastatin: 'H', lovastatin: 'H', fluvastatin: 'H', fenofibrate: 'H',
  gemfibrozil: 'H', bezafibrate: 'H', 'ciprofibrate': 'H', ezetimibe: 'H',
  'bempedoic acid': 'H', evolocumab: 'H', alirocumab: 'H', colestyramine: 'H',
  cholestyramine: 'H', colesevelam: 'H', 'saroglitazar': 'H',

  // --- Antiplatelets & anticoagulants -----------------------------
  clopidogrel: 'H', prasugrel: 'H', ticagrelor: 'H', ticlopidine: 'H',
  cilostazol: 'H', warfarin: 'H1', acenocoumarol: 'H1', nicoumalone: 'H1',
  dabigatran: 'H1', rivaroxaban: 'H1', apixaban: 'H1', edoxaban: 'H1',
  'enoxaparin': 'H', dalteparin: 'H', 'nadroparin': 'H', fondaparinux: 'H',
  'heparin': 'H', 'dulteparin': 'H',

  // --- Oral antidiabetics & insulins ----------------------------
  metformin: 'H', glimepiride: 'H', glipizide: 'H', gliclazide: 'H',
  glibenclamide: 'H', glyburide: 'H', glibornuride: 'H',
  sitagliptin: 'H', vildagliptin: 'H', saxagliptin: 'H', linagliptin: 'H',
  teneligliptin: 'H', alogliptin: 'H', gemigliptin: 'H', evogliptin: 'H',
  dapagliflozin: 'H', empagliflozin: 'H', canagliflozin: 'H', ertugliflozin: 'H',
  remogliflozin: 'H', 'bexagliflozin': 'H',
  pioglitazone: 'H', rosiglitazone: 'H', lobeglitazone: 'H',
  repaglinide: 'H', nateglinide: 'H', voglibose: 'H', acarbose: 'H', miglitol: 'H',
  insulin: 'H', 'insulin glargine': 'H', 'insulin aspart': 'H',
  'insulin lispro': 'H', 'insulin degludec': 'H', 'insulin detemir': 'H',
  'insulin glulisine': 'H', 'insulin isophane': 'H', 'isophane insulin': 'H',
  liraglutide: 'H', dulaglutide: 'H', semaglutide: 'H', exenatide: 'H',
  lixisenatide: 'H', tirzepatide: 'H',

  // --- Systemic corticosteroids ---------------------------------
  prednisolone: 'H', prednisone: 'H', methylprednisolone: 'H', dexamethasone: 'H',
  betamethasone: 'H', hydrocortisone: 'H', triamcinolone: 'H', deflazacort: 'H',
  fludrocortisone: 'H', cortisone: 'H', 'paramethasone': 'H',

  // --- Thyroid & other endocrine -------------------------------
  levothyroxine: 'H', thyroxine: 'H', liothyronine: 'H', carbimazole: 'H',
  methimazole: 'H', 'thiamazole': 'H', propylthiouracil: 'H',
  cabergoline: 'H', bromocriptine: 'H', 'quinagolide': 'H',
  octreotide: 'H', lanreotide: 'H', somatropin: 'H', 'somatrem': 'H',
  desmopressin: 'H', 'terlipressin': 'H', vasopressin: 'H', teriparatide: 'H',
  'abaloparatide': 'H', calcitonin: 'H', cinacalcet: 'H', 'etelcalcetide': 'H',
  denosumab: 'H',
  'alendronate': 'H', 'alendronic acid': 'H', 'risedronate': 'H',
  'ibandronate': 'H', 'zoledronic acid': 'H', 'zoledronate': 'H',
  'pamidronate': 'H',

  // --- Sex hormones, HRT, fertility, prostate ------------------
  estradiol: 'H', 'estradiol valerate': 'H', 'conjugated estrogens': 'H',
  'ethinylestradiol': 'H', 'ethinyloestradiol': 'H', progesterone: 'H',
  dydrogesterone: 'H', norethisterone: 'H', 'medroxyprogesterone': 'H',
  'hydroxyprogesterone': 'H', desogestrel: 'H', drospirenone: 'H',
  gestodene: 'H', 'nomegestrol': 'H', 'dienogest': 'H', 'cyproterone': 'H',
  tibolone: 'H', ulipristal: 'H', mifepristone: 'H', misoprostol: 'H',
  clomiphene: 'H', 'clomifene': 'H', letrozole: 'H', 'menotropins': 'H',
  'follitropin': 'H', 'urofollitropin': 'H', 'chorionic gonadotropin': 'H',
  testosterone: 'H', 'mesterolone': 'H', 'nandrolone': 'X',
  tamsulosin: 'H', alfuzosin: 'H', silodosin: 'H', finasteride: 'H',
  dutasteride: 'H', 'gonadorelin': 'H', goserelin: 'H', leuprolide: 'H',
  'leuprorelin': 'H', triptorelin: 'H', degarelix: 'H', 'nafarelin': 'H',

  // --- Benzodiazepines & Z-drugs (habit forming) --------------
  alprazolam: 'H1', diazepam: 'H1', lorazepam: 'H1', clonazepam: 'H1',
  chlordiazepoxide: 'H1', nitrazepam: 'H1', etizolam: 'H1', clobazam: 'H1',
  midazolam: 'H1', oxazepam: 'H1', temazepam: 'H1', flurazepam: 'H1',
  estazolam: 'H1', 'clorazepate': 'H1', 'bromazepam': 'H1', 'prazepam': 'H1',
  'lormetazepam': 'H1', 'flunitrazepam': 'X',
  zolpidem: 'H1', zopiclone: 'H1', eszopiclone: 'H1', zaleplon: 'H1',
  'buspirone': 'H',

  // --- Barbiturates & related (Schedule X) -------------------
  phenobarbitone: 'X', phenobarbital: 'X', pentobarbital: 'X',
  secobarbital: 'X', amobarbital: 'X', butalbital: 'X', 'butobarbital': 'X',
  thiopental: 'X', 'thiopentone': 'X', 'methohexital': 'X',

  // --- Stimulants / ADHD / wakefulness -----------------------
  methylphenidate: 'X', 'dexamfetamine': 'X', dextroamphetamine: 'X',
  amphetamine: 'X', lisdexamfetamine: 'X', 'methamphetamine': 'X',
  atomoxetine: 'H', modafinil: 'H1', armodafinil: 'H1',

  // --- Opioids & opioid-acting analgesics --------------------
  tramadol: 'H1', tapentadol: 'H1', codeine: 'H1', 'dihydrocodeine': 'H1',
  'pholcodine': 'H1', morphine: 'X', fentanyl: 'X', 'sufentanil': 'X',
  'remifentanil': 'X', buprenorphine: 'X', oxycodone: 'X', hydromorphone: 'X',
  'oxymorphone': 'X', methadone: 'X', pethidine: 'X', 'meperidine': 'X',
  pentazocine: 'H1', nalbuphine: 'H', butorphanol: 'H', 'dextropropoxyphene': 'H1',
  naltrexone: 'H', nalmefene: 'H', naloxone: 'H',

  // --- Antidepressants ------------------------------------
  amitriptyline: 'H', imipramine: 'H', clomipramine: 'H', dosulepin: 'H',
  dothiepin: 'H', nortriptyline: 'H', 'trimipramine': 'H', 'lofepramine': 'H',
  fluoxetine: 'H', sertraline: 'H', paroxetine: 'H', escitalopram: 'H',
  citalopram: 'H', fluvoxamine: 'H', venlafaxine: 'H', desvenlafaxine: 'H',
  duloxetine: 'H', milnacipran: 'H', 'levomilnacipran': 'H', mirtazapine: 'H',
  bupropion: 'H', amoxapine: 'H', trazodone: 'H', vortioxetine: 'H',
  vilazodone: 'H', agomelatine: 'H', tianeptine: 'H', moclobemide: 'H',
  'reboxetine': 'H',

  // --- Antipsychotics ------------------------------------
  haloperidol: 'H', chlorpromazine: 'H', trifluoperazine: 'H', olanzapine: 'H',
  risperidone: 'H', quetiapine: 'H', aripiprazole: 'H', ziprasidone: 'H',
  clozapine: 'H', amisulpride: 'H', sulpiride: 'H', paliperidone: 'H',
  lurasidone: 'H', cariprazine: 'H', brexpiprazole: 'H', flupentixol: 'H',
  'flupenthixol': 'H', zuclopenthixol: 'H', pimozide: 'H', loxapine: 'H',
  asenapine: 'H', blonanserin: 'H', 'penfluridol': 'H', 'thioridazine': 'H',
  'haloperidol decanoate': 'H',

  // --- Mood stabilisers & antiepileptics ---------------
  lithium: 'H', 'lithium carbonate': 'H', 'sodium valproate': 'H',
  'valproic acid': 'H', valproate: 'H', divalproex: 'H', 'valproate semisodium': 'H',
  carbamazepine: 'H', oxcarbazepine: 'H', eslicarbazepine: 'H', phenytoin: 'H',
  fosphenytoin: 'H', lamotrigine: 'H', levetiracetam: 'H', brivaracetam: 'H',
  topiramate: 'H', gabapentin: 'H', pregabalin: 'H1', vigabatrin: 'H',
  lacosamide: 'H', perampanel: 'H', zonisamide: 'H', ethosuximide: 'H',
  tiagabine: 'H', rufinamide: 'H', primidone: 'H', 'sultiame': 'H',
  'clobazam ': 'H1', 'stiripentol': 'H', 'cannabidiol': 'H',

  // --- Anti-parkinson & anti-dementia ------------------
  levodopa: 'H', carbidopa: 'H', benserazide: 'H', pramipexole: 'H',
  ropinirole: 'H', rotigotine: 'H', selegiline: 'H', rasagiline: 'H',
  safinamide: 'H', entacapone: 'H', tolcapone: 'H', opicapone: 'H',
  trihexyphenidyl: 'H', 'benzhexol': 'H', biperiden: 'H', 'procyclidine': 'H',
  amantadine: 'H', apomorphine: 'H',
  donepezil: 'H', rivastigmine: 'H', galantamine: 'H', memantine: 'H',

  // --- Muscle relaxants (centrally acting) --------------
  baclofen: 'H', tizanidine: 'H', thiocolchicoside: 'H', chlorzoxazone: 'H',
  cyclobenzaprine: 'H', dantrolene: 'H', eperisone: 'H', tolperisone: 'H',
  methocarbamol: 'H', carisoprodol: 'H1', orphenadrine: 'H', 'pridinol': 'H',

  // --- Triptans & ergot ------------------------------
  sumatriptan: 'H', rizatriptan: 'H', zolmitriptan: 'H', naratriptan: 'H',
  eletriptan: 'H', frovatriptan: 'H', almotriptan: 'H', ergotamine: 'H1',
  dihydroergotamine: 'H1', 'methysergide': 'H', 'flunarizine': 'H',

  // --- Respiratory (inhaled / oral maintenance) -------
  budesonide: 'H', 'fluticasone propionate': 'H', 'fluticasone furoate': 'H',
  beclomethasone: 'H', beclometasone: 'H', ciclesonide: 'H',
  'mometasone furoate': 'H', formoterol: 'H', salmeterol: 'H', vilanterol: 'H',
  indacaterol: 'H', olodaterol: 'H', arformoterol: 'H', bambuterol: 'H',
  tiotropium: 'H', umeclidinium: 'H', aclidinium: 'H', 'glycopyrronium': 'H',
  theophylline: 'H', aminophylline: 'H', doxofylline: 'H', bamifylline: 'H',
  montelukast: 'H', zafirlukast: 'H', pranlukast: 'H', zileuton: 'H',
  roflumilast: 'H', omalizumab: 'H', mepolizumab: 'H', benralizumab: 'H',
  dupilumab: 'H', 'pirfenidone': 'H', 'nintedanib': 'H',
  'ambroxol ': 'OTC',

  // --- GI: proton pump inhibitors & prokinetics ------
  omeprazole: 'H', esomeprazole: 'H', pantoprazole: 'H', rabeprazole: 'H',
  lansoprazole: 'H', dexlansoprazole: 'H', ilaprazole: 'H', 'dexrabeprazole': 'H',
  'vonoprazan': 'H',
  domperidone: 'H', metoclopramide: 'H', itopride: 'H', levosulpiride: 'H',
  mosapride: 'H', prucalopride: 'H', cinitapride: 'H',
  ondansetron: 'H', granisetron: 'H', palonosetron: 'H', ramosetron: 'H',
  aprepitant: 'H', fosaprepitant: 'H', 'netupitant': 'H', 'rolapitant': 'H',
  promethazine: 'H', prochlorperazine: 'H',
  mesalamine: 'H', mesalazine: 'H', sulfasalazine: 'H', salazosulfapyridine: 'H',
  balsalazide: 'H', 'olsalazine': 'H',
  'ursodeoxycholic acid': 'H', 'obeticholic acid': 'H',
  'l-ornithine l-aspartate': 'H', 'ornithine aspartate': 'H',

  // --- Immunosuppressants & DMARDs -----------------
  methotrexate: 'H', azathioprine: 'H', mycophenolate: 'H',
  'mycophenolate mofetil': 'H', 'mycophenolic acid': 'H', cyclosporine: 'H',
  ciclosporin: 'H', cyclosporin: 'H', tacrolimus: 'H', sirolimus: 'H',
  everolimus: 'H', leflunomide: 'H', 'teriflunomide': 'H', apremilast: 'H',
  tofacitinib: 'H', baricitinib: 'H', upadacitinib: 'H', 'filgotinib': 'H',
  adalimumab: 'H', etanercept: 'H', infliximab: 'H', golimumab: 'H',
  'certolizumab': 'H', rituximab: 'H', tocilizumab: 'H', secukinumab: 'H',
  ustekinumab: 'H', 'ixekizumab': 'H', 'guselkumab': 'H', abatacept: 'H',
  'fingolimod': 'H', 'dimethyl fumarate': 'H', 'ocrelizumab': 'H',
  'natalizumab': 'H',

  // --- Cytotoxic / targeted oncology ---------------
  cyclophosphamide: 'H', ifosfamide: 'H', chlorambucil: 'H', melphalan: 'H',
  busulfan: 'H', 'bendamustine': 'H', capecitabine: 'H', 'fluorouracil': 'H',
  '5-fluorouracil': 'H', gemcitabine: 'H', cytarabine: 'H', 'mercaptopurine': 'H',
  '6-mercaptopurine': 'H', fludarabine: 'H', 'pemetrexed': 'H', cisplatin: 'H',
  carboplatin: 'H', oxaliplatin: 'H', paclitaxel: 'H', 'nab-paclitaxel': 'H',
  docetaxel: 'H', 'cabazitaxel': 'H', doxorubicin: 'H', epirubicin: 'H',
  'daunorubicin': 'H', 'idarubicin': 'H', 'mitoxantrone': 'H', etoposide: 'H',
  'irinotecan': 'H', 'topotecan': 'H', vincristine: 'H', vinblastine: 'H',
  'vinorelbine': 'H', 'bleomycin': 'H', 'dacarbazine': 'H', 'temozolomide': 'H',
  imatinib: 'H', dasatinib: 'H', nilotinib: 'H', 'bosutinib': 'H', 'ponatinib': 'H',
  erlotinib: 'H', gefitinib: 'H', afatinib: 'H', osimertinib: 'H', 'lapatinib': 'H',
  sorafenib: 'H', sunitinib: 'H', 'pazopanib': 'H', 'regorafenib': 'H',
  'lenvatinib': 'H', 'cabozantinib': 'H', 'axitinib': 'H', 'vandetanib': 'H',
  everolimus_oncology: 'H', 'ibrutinib': 'H', 'acalabrutinib': 'H',
  'venetoclax': 'H', 'ruxolitinib': 'H', 'palbociclib': 'H', 'ribociclib': 'H',
  'abemaciclib': 'H', 'olaparib': 'H', 'niraparib': 'H',
  lenalidomide: 'X', thalidomide: 'X', pomalidomide: 'X', bortezomib: 'H',
  'carfilzomib': 'H', 'ixazomib': 'H', hydroxyurea: 'H', hydroxycarbamide: 'H',
  anagrelide: 'H', abiraterone: 'H', enzalutamide: 'H', 'apalutamide': 'H',
  'darolutamide': 'H', bicalutamide: 'H', flutamide: 'H', 'nilutamide': 'H',
  anastrozole: 'H', exemestane: 'H', tamoxifen: 'H', 'toremifene': 'H',
  'fulvestrant': 'H', 'megestrol': 'H',
  trastuzumab: 'H', bevacizumab: 'H', cetuximab: 'H', 'panitumumab': 'H',
  pembrolizumab: 'H', nivolumab: 'H', 'atezolizumab': 'H', 'durvalumab': 'H',
  'ipilimumab': 'H',

  // --- Haematology / nephrology (parenteral, specialist) ---
  epoetin: 'H', 'epoetin alfa': 'H', 'erythropoietin': 'H', darbepoetin: 'H',
  filgrastim: 'H', 'pegfilgrastim': 'H', 'lenograstim': 'H', romiplostim: 'H',
  eltrombopag: 'H', 'avatrombopag': 'H', 'ferric carboxymaltose': 'H',
  'iron sucrose': 'H', 'ferric derisomaltose': 'H', deferasirox: 'H',
  deferiprone: 'H', 'deferoxamine': 'H', 'sevelamer': 'H',
  'lanthanum carbonate': 'H',

  // --- Ophthalmic (glaucoma) & specialist eye ------
  latanoprost: 'H', bimatoprost: 'H', travoprost: 'H', 'tafluprost': 'H',
  brimonidine: 'H', dorzolamide: 'H', brinzolamide: 'H', 'timolol maleate': 'H',
  pilocarpine: 'H', 'acetazolamide': 'H', 'ranibizumab': 'H', 'aflibercept': 'H',
  'brolucizumab': 'H', cyclopentolate: 'H', 'homatropine': 'H',

  // --- Urology / overactive bladder / BPH ----------
  solifenacin: 'H', tolterodine: 'H', darifenacin: 'H', fesoterodine: 'H',
  oxybutynin: 'H', trospium: 'H', mirabegron: 'H', 'vibegron': 'H',
  dapoxetine: 'H', 'flavoxate': 'H', 'desmopressin acetate': 'H',

  // --- Selected sedating / potent antihistamines ---
  hydroxyzine: 'H', 'ketotifen': 'H', 'cyproheptadine': 'H',

  // --- Other prescription-only drug substances -----
  colchicine: 'H', 'febuxostat': 'H', 'allopurinol': 'H', 'probenecid': 'H',
  'rasburicase': 'H', 'pegloticase': 'H',
  isotretinoin: 'H', acitretin: 'H', 'alitretinoin': 'H', 'tretinoin': 'H',
  'ketorolac': 'H', 'parecoxib': 'H', 'celecoxib': 'H',
  'riluzole': 'H', 'edaravone': 'H', 'nusinersen': 'H',
  'sacubitril valsartan': 'H', 'dofetilide ': 'H',
  'varenicline': 'H', 'disulfiram': 'H', 'acamprosate': 'H',
  'pyridostigmine': 'H', 'neostigmine': 'H', 'edrophonium': 'H',
  'ketamine': 'X', 'nitrous oxide': 'H', 'propofol': 'H', 'etomidate': 'H',
  'dexmedetomidine': 'H', 'rocuronium': 'H', 'vecuronium': 'H',
  'atracurium': 'H', 'cisatracurium': 'H', 'succinylcholine': 'H',
  'suxamethonium': 'H',

  // --- Common OTC drug substances (explicitly non-prescription) ---
  paracetamol: 'OTC', acetaminophen: 'OTC', ibuprofen: 'OTC', aspirin: 'OTC',
  'acetylsalicylic acid': 'OTC', diclofenac: 'OTC', aceclofenac: 'OTC',
  naproxen: 'OTC', 'mefenamic acid': 'OTC', ketoprofen: 'OTC',
  dexketoprofen: 'OTC', flurbiprofen: 'OTC', piroxicam: 'OTC', meloxicam: 'OTC',
  nimesulide: 'OTC', etoricoxib: 'OTC', etodolac: 'OTC', lornoxicam: 'OTC',
  nabumetone: 'OTC', indomethacin: 'OTC', 'diclofenac diethylamine': 'OTC',
  serratiopeptidase: 'OTC', 'trypsin': 'OTC', 'chymotrypsin': 'OTC',
  bromelain: 'OTC', 'paracetamol ': 'OTC',
  cetirizine: 'OTC', levocetirizine: 'OTC', loratadine: 'OTC',
  desloratadine: 'OTC', fexofenadine: 'OTC', bilastine: 'OTC', rupatadine: 'OTC',
  ebastine: 'OTC', 'chlorpheniramine': 'OTC', 'chlorphenamine': 'OTC',
  diphenhydramine: 'OTC', pheniramine: 'OTC', cinnarizine: 'OTC',
  'meclizine': 'OTC', 'meclozine': 'OTC', dimenhydrinate: 'OTC',
  doxylamine: 'OTC', acrivastine: 'OTC', 'betahistine': 'OTC',
  ranitidine: 'OTC', famotidine: 'OTC', nizatidine: 'OTC', roxatidine: 'OTC',
  cimetidine: 'OTC', 'antacid': 'OTC', 'magaldrate': 'OTC',
  'aluminium hydroxide': 'OTC', 'magnesium hydroxide': 'OTC',
  'calcium carbonate': 'OTC', simethicone: 'OTC', 'activated dimethicone': 'OTC',
  'sucralfate': 'OTC', 'sodium bicarbonate': 'OTC',
  dicyclomine: 'OTC', dicycloverine: 'OTC', drotaverine: 'OTC',
  'hyoscine': 'OTC', 'hyoscine butylbromide': 'OTC', mebeverine: 'OTC',
  'peppermint oil': 'OTC',
  ambroxol: 'OTC', bromhexine: 'OTC', guaifenesin: 'OTC', guaiphenesin: 'OTC',
  'dextromethorphan': 'OTC', 'terpin hydrate': 'OTC', 'menthol': 'OTC',
  'phenylephrine': 'OTC', 'pseudoephedrine': 'OTC', 'xylometazoline': 'OTC',
  'oxymetazoline': 'OTC', 'sodium chloride': 'OTC',
  'oral rehydration salts': 'OTC', 'ors': 'OTC', 'zinc': 'OTC',
  'lactic acid bacillus': 'OTC', 'saccharomyces boulardii': 'OTC',
  'racecadotril': 'OTC', 'loperamide': 'OTC', 'bismuth subsalicylate': 'OTC',
  'lactulose': 'OTC', 'liquid paraffin': 'OTC', 'ispaghula': 'OTC',
  'psyllium': 'OTC', 'sodium picosulphate': 'OTC', 'bisacodyl': 'OTC',
  'glycerin': 'OTC', 'senna': 'OTC', 'sennoside': 'OTC',
  methylcobalamin: 'OTC', 'mecobalamin': 'OTC', cyanocobalamin: 'OTC',
  'folic acid': 'OTC', 'thiamine': 'OTC', pyridoxine: 'OTC', riboflavin: 'OTC',
  niacinamide: 'OTC', nicotinamide: 'OTC', 'ascorbic acid': 'OTC',
  'vitamin c': 'OTC', cholecalciferol: 'OTC', 'vitamin d3': 'OTC',
  'calcitriol': 'OTC', alfacalcidol: 'OTC', 'ergocalciferol': 'OTC',
  'calcium citrate': 'OTC', 'calcium gluconate': 'OTC',
  'ferrous sulphate': 'OTC', 'ferrous fumarate': 'OTC', 'ferrous ascorbate': 'OTC',
  'ferrous gluconate': 'OTC', 'carbonyl iron': 'OTC', 'iron polymaltose': 'OTC',
  'folic acid ': 'OTC', 'l-methylfolate': 'OTC', biotin: 'OTC',
  'benfotiamine': 'OTC', 'alpha lipoic acid': 'OTC', 'thioctic acid': 'OTC',
  'coenzyme q10': 'OTC', 'ubidecarenone': 'OTC', 'l-carnitine': 'OTC',
  'l-arginine': 'OTC', 'omega 3 fatty acids': 'OTC', 'fish oil': 'OTC',
  'multivitamin': 'OTC', 'lycopene': 'OTC', 'evening primrose oil': 'OTC',
  'chromium picolinate': 'OTC', 'inositol': 'OTC', 'choline': 'OTC',
  'zinc sulphate': 'OTC', 'zinc gluconate': 'OTC', 'zinc acetate': 'OTC',
  'levosalbutamol': 'OTC', 'salbutamol': 'OTC', 'levocloperastine': 'OTC',
  'chlorpheniramine maleate': 'OTC',
  clotrimazole: 'OTC', miconazole: 'OTC', 'tolnaftate': 'OTC',
  'povidone iodine': 'OTC', 'chlorhexidine': 'OTC', 'silver sulfadiazine': 'OTC',
  'calamine': 'OTC', 'zinc oxide': 'OTC', 'permethrin': 'OTC',
  'benzyl benzoate': 'OTC', 'lindane': 'H',
  'diclofenac sodium': 'OTC', 'thiamine mononitrate': 'OTC',
  'tranexamic acid': 'OTC', 'etamsylate': 'OTC', 'ethamsylate': 'OTC',
  'clove oil': 'OTC', 'lignocaine': 'OTC', 'lidocaine': 'OTC',
  'choline salicylate': 'OTC', 'benzocaine': 'OTC',
  'sodium cromoglycate': 'OTC', 'olopatadine': 'OTC', 'ketorolac tromethamine': 'H',
  'artificial tears': 'OTC', 'carboxymethylcellulose': 'OTC',
  'hypromellose': 'OTC', 'sodium hyaluronate': 'OTC',
  levonorgestrel: 'OTC',

  // --- Second pass: gaps surfaced by the full-CSV audit ------------------
  // Prescription (H / H1 / X)
  tazobactum: 'H1', // common misspelling of tazobactam in the dataset
  diltiazem: 'H', 'verapamil': 'H', 'nicardipine': 'H', 'clevidipine': 'H',
  's-amlodipine': 'H', 'levamlodipine besylate': 'H',
  'isosorbide': 'H', 'ivabradine hydrochloride': 'H',
  mometasone: 'H', fluticasone: 'H', 'ciclesonide ': 'H',
  terbutaline: 'H', 'acebrophylline': 'H', 'acefylline': 'H',
  'bambuterol ': 'H', 'ketotifen ': 'H',
  timolol: 'H', 'loteprednol': 'H', 'loteprednol etabonate': 'H',
  fluorometholone: 'H', 'nepafenac': 'H', 'bromfenac': 'H', 'difluprednate': 'H',
  'prednisolone acetate': 'H', 'moxifloxacin ': 'H1',
  clobetasol: 'H', halobetasol: 'H', 'clobetasone': 'H',
  'fluocinolone': 'H', 'fluocinolone acetonide': 'H', 'fluocinonide': 'H',
  'desonide': 'H', 'desoximetasone': 'H', 'flurandrenolide': 'H',
  'mometasone furoate ': 'H',
  piracetam: 'H', citicoline: 'H', 'cerebrolysin': 'H', 'piribedil': 'H',
  'vinpocetine': 'H', 'melitracen': 'H', 'flupentixol melitracen': 'H',
  flupirtine: 'H', 'nefopam': 'H',
  diacerein: 'H', 'diacerhein': 'H',
  isoxsuprine: 'H', 'ritodrine': 'H', 'nylidrin': 'H',
  clidinium: 'H', 'clidinium bromide': 'H',
  'alpha-beta arteether': 'H', 'beta arteether': 'H',
  'recombinant human erythropoietin': 'H',
  'recombinant human erythropoietin alfa': 'H',
  'human chorionic gonadotropin': 'H', 'human menopausal gonadotropin': 'H',
  'ethinyl estradiol': 'H', 'estriol': 'H', 'estrone': 'H',
  'ospemifene': 'H', 'bazedoxifene': 'H',
  'hydroquinone': 'H', 'monobenzone': 'H',
  'sodium cromoglicate': 'H',
  'nandrolone decanoate': 'X', 'stanozolol': 'X', 'oxymetholone': 'X',
  'oxandrolone': 'X', 'boldenone': 'X',
  'gamma hydroxybutyrate': 'X', 'sodium oxybate': 'X',
  'phentermine': 'X', 'diethylpropion': 'X', 'sibutramine': 'X',

  // Over the counter
  albendazole: 'OTC', mebendazole: 'OTC', 'pyrantel': 'OTC',
  'pyrantel pamoate': 'OTC', 'niclosamide': 'OTC',
  lactobacillus: 'OTC', 'lactobacillus sporogenes': 'OTC',
  'bacillus clausii': 'OTC', 'bacillus coagulans': 'OTC', 'streptococcus': 'OTC',
  'bifidobacterium': 'OTC', 'probiotic': 'OTC', 'prebiotic': 'OTC',
  'fructo-oligosaccharide': 'OTC', 'fructooligosaccharides': 'OTC',
  luliconazole: 'OTC', sertaconazole: 'OTC', 'oxiconazole': 'OTC',
  'eberconazole': 'OTC', 'butenafine': 'OTC', 'amorolfine': 'OTC',
  'ciclopirox': 'OTC', 'ciclopirox olamine': 'OTC', 'undecylenic acid': 'OTC',
  'tricholine': 'OTC', 'tricholine citrate': 'OTC',
  'vitamin b6': 'OTC', 'vitamin b12': 'OTC', 'vitamin b1': 'OTC',
  'vitamin b complex': 'OTC', 'vitamin e': 'OTC', 'vitamin a': 'OTC',
  'vitamin k': 'OTC', 'tocopherol': 'OTC', 'tocopheryl acetate': 'OTC',
  'dexpanthenol': 'OTC', 'calcium pantothenate': 'OTC', 'panthenol': 'OTC',
  caffeine: 'OTC', 'caffeine anhydrous': 'OTC',
  'salicylic acid': 'OTC', 'lactic acid': 'OTC', 'urea': 'OTC',
  'glycolic acid': 'OTC', 'coal tar': 'OTC', 'dithranol': 'OTC',
  'zinc pyrithione': 'OTC', pyrithione: 'OTC', 'selenium sulphide': 'OTC',
  'selenium sulfide': 'OTC', 'ketoconazole ': 'OTC',
  glucosamine: 'OTC', 'glucosamine sulphate': 'OTC',
  'glucosamine sulfate potassium chloride': 'OTC', 'chondroitin': 'OTC',
  'chondroitin sulphate': 'OTC', 'diacerein ': 'OTC', 'collagen peptide': 'OTC',
  'methylsulfonylmethane': 'OTC', 'rutoside': 'OTC', 'troxerutin': 'OTC',
  'diosmin': 'OTC', 'hesperidin': 'OTC', 'calcium dobesilate': 'OTC',
  dobesilate: 'OTC',
  acetylcysteine: 'OTC', 'n-acetylcysteine': 'OTC', 'carbocisteine': 'OTC',
  'carbocysteine': 'OTC', 'erdosteine': 'OTC', 'bromhexine ': 'OTC',
  oxetacaine: 'OTC', oxethazaine: 'OTC', 'oxethazaine ': 'OTC',
  'phenylpropanolamine': 'OTC', 'ammonium chloride': 'OTC',
  'sodium citrate': 'OTC', 'potassium citrate': 'OTC',
  'disodium hydrogen citrate': 'OTC', 'chlorpheniramine ': 'OTC',
  pancreatin: 'OTC', 'pancrelipase': 'OTC', 'pepsin': 'OTC', 'diastase': 'OTC',
  'fungal diastase': 'OTC', 'alpha amylase': 'OTC', 'papain': 'OTC',
  silymarin: 'OTC', 'silibinin': 'OTC', 'l-ornithine': 'OTC',
  'levo-carnitine': 'OTC', levocarnitine: 'OTC',
  melatonin: 'OTC', 'l-tryptophan': 'OTC',
  orlistat: 'OTC',
  'benzoyl peroxide': 'OTC', 'adapalene': 'OTC', 'azelaic acid': 'OTC',
  'nadifloxacin ': 'OTC', 'clindamycin ': 'OTC',
  naphazoline: 'OTC', 'tetrahydrozoline': 'OTC', 'phenylephrine ': 'OTC',
  'boric acid': 'OTC', 'zinc sulphate ': 'OTC',
  'hydroxypropyl methylcellulose': 'OTC', hypromellose: 'OTC',
  'hydroxypropylmethylcellulose': 'OTC', 'polyvinyl alcohol': 'OTC',
  'polyethylene glycol': 'OTC', 'propylene glycol': 'OTC',
  'sodium hyaluronate ': 'OTC', hyaluronate: 'OTC', 'hyaluronic acid': 'OTC',
  dimethicone: 'OTC', 'activated dimethicone ': 'OTC', 'dimethylpolysiloxane': 'OTC',
  lactitol: 'OTC', 'polyethylene glycol 3350': 'OTC', 'macrogol': 'OTC',
  'sodium picosulfate': 'OTC', picosulfate: 'OTC', 'castor oil': 'OTC',
  'linseed oil': 'OTC', 'arachis oil': 'OTC', 'docusate': 'OTC',
  'docusate sodium': 'OTC', 'liquid paraffin ': 'OTC',
  'cetrimide': 'OTC', 'framycetin ': 'OTC',
  rofecoxib: 'OTC', 'valdecoxib': 'OTC', 'paracoxib': 'OTC',
  'aceclofenac ': 'OTC', 'thiocolchicoside ': 'H',
  'menthol ': 'OTC', 'camphor': 'OTC', 'eucalyptus oil': 'OTC',
  'methyl salicylate': 'OTC', 'diclofenac diethylammonium': 'OTC',
  // fragment tokens left over from multi-word electrolyte / mineral salts
  disodium: 'OTC', chloride: 'OTC', carbonate: 'OTC', bicarbonate: 'OTC',
  citrate: 'OTC', phosphate: 'OTC', gluconate: 'OTC',
  calcium: 'OTC', magnesium: 'OTC', sodium: 'OTC', potassium: 'OTC',
  iron: 'OTC', ammonium: 'OTC', zinc: 'OTC', manganese: 'OTC',
  selenium: 'OTC', copper: 'OTC', chromium: 'OTC', molybdenum: 'OTC',
  benzalkonium: 'OTC', cetylpyridinium: 'OTC', 'citric acid': 'OTC',

  // --- Third pass: further audit gaps -----------------------------------
  // Prescription (H / H1 / X)
  methylergometrine: 'H', 'methylergonovine': 'H', 'ergometrine': 'H',
  'ergonovine': 'H', 'carboprost': 'H', 'dinoprostone': 'H', oxytocin: 'H',
  'carbetocin': 'H',
  etofylline: 'H', 'etophylline': 'H',
  sultamicillin: 'H1', 'sulmicillin': 'H1',
  menotrophin: 'H', 'follicle stimulating hormone': 'H',
  'recombinant follicle stimulating hormone': 'H', 'follitropin alfa': 'H',
  'cerebroprotein hydrolysate': 'H', 'cerebroprotein': 'H',
  furazolidone: 'H',
  atropine: 'H', 'atropine sulphate': 'H', tropicamide: 'H',
  'homatropine ': 'H', 'cyclopentolate ': 'H',
  ipratropium: 'H', 'ipratropium ': 'H', glycopyrrolate: 'H',
  'glycopyrronium ': 'H', 'tiotropium ': 'H',
  allylestrenol: 'H', 'allyloestrenol': 'H',
  levamisole: 'H',
  dehydroepiandrosterone: 'H', 'prasterone': 'H',
  trioxsalen: 'H', 'trioxysalen': 'H', 'methoxsalen': 'H', 'psoralen': 'H',
  '8-methoxypsoralen': 'H', 'bergapten': 'H',
  cisapride: 'H',
  metaxalone: 'H',
  doxepin: 'H',
  danazol: 'H', 'gestrinone': 'H',
  azelnidipine: 'H', 'manidipine': 'H', 'efonidipine': 'H', 'aranidipine': 'H',
  stavudine: 'H', 'didanosine': 'H', 'indinavir': 'H', 'saquinavir': 'H',
  'nelfinavir': 'H',
  'tetanus toxoid': 'H', 'diphtheria toxoid': 'H', 'hepatitis b vaccine': 'H',
  'rabies vaccine': 'H', 'anti-rabies serum': 'H', 'anti-snake venom': 'H',
  'immunoglobulin': 'H', 'anti-d immunoglobulin': 'H',
  'clomipramine ': 'H', 'nortriptyline ': 'H',
  'human insulin': 'H', 'soluble insulin': 'H',
  'human insulin soluble insulin': 'H', 'human mixtard insulin': 'H',
  'regular insulin': 'H', 'nph insulin': 'H', 'premix insulin': 'H',
  'flunarizine ': 'H', 'cinnarizine ': 'OTC',

  // Over the counter
  chlorbutol: 'OTC', 'chlorbutanol': 'OTC', 'benzyl alcohol': 'OTC',
  'phenoxyethanol': 'OTC', 'thiomersal': 'OTC',
  'alpha ketoanalogue': 'OTC', 'ketoanalogue': 'OTC',
  'compound alpha ketoanalogues': 'OTC',
  dexchlorpheniramine: 'OTC', triprolidine: 'OTC', 'clemastine': 'OTC',
  'dexbrompheniramine': 'OTC', 'brompheniramine': 'OTC', 'buclizine': 'OTC',
  'ginkgo biloba': 'OTC', 'ginseng': 'OTC', 'panax ginseng': 'OTC',
  'myo-inositol': 'OTC', 'd-chiro-inositol': 'OTC',
  azelastine: 'OTC', 'epinastine': 'OTC', 'emedastine': 'OTC', 'bepotastine': 'OTC',
  'oxychloro complex': 'OTC', 'stabilized oxychloro complex': 'OTC',
  'milk of magnesia': 'OTC', sorbitol: 'OTC', mannitol: 'OTC',
  'lactic acid bacillus ': 'OTC',
  glutathione: 'OTC', 'l-glutathione': 'OTC', 'l-cysteine': 'OTC',
  'capsaicin': 'OTC', 'capsaicin based rubefacients': 'OTC',
  'oleoresin capsicum': 'OTC', 'diclofenac ': 'OTC',
  clioquinol: 'OTC', 'iodochlorhydroxyquinoline': 'OTC', 'clioquinol ': 'OTC',
  'taurine': 'OTC', 'l-taurine': 'OTC', 'creatine': 'OTC',
  'l-lysine': 'OTC', 'l-leucine': 'OTC', 'branched chain amino acids': 'OTC',
  'soya isoflavones': 'OTC', 'wheat germ oil': 'OTC', 'shark liver oil': 'OTC',
  'cod liver oil': 'OTC', 'colecalciferol': 'OTC',
  'l-methyl folate': 'OTC', 'levomefolate': 'OTC', 'metafolin': 'OTC',
  'aloe vera': 'OTC', 'curcumin': 'OTC', 'boswellia serrata': 'OTC',
  'ashwagandha': 'OTC', 'withania somnifera': 'OTC',

  // --- Fourth pass: remaining long tail ------------------------------
  // Prescription (H / H1 / X)
  trioxasalen: 'H',
  albumin: 'H', 'human albumin': 'H', 'human normal immunoglobulin': 'H',
  'normal immunoglobulin': 'H',
  moxonidine: 'H', 'rilmenidine': 'H',
  sulphacetamide: 'H', 'sodium sulphacetamide': 'H',
  'ibandronic acid': 'H', 'risedronic acid': 'H', 'pamidronic acid': 'H',
  leucovorin: 'H', 'folinic acid': 'H', 'calcium folinate': 'H',
  'levoleucovorin': 'H',
  tolvaptan: 'H', 'conivaptan': 'H',
  acotiamide: 'H',
  dobutamine: 'H', dopamine: 'H', noradrenaline: 'H', norepinephrine: 'H',
  adrenaline: 'H', 'phenylephrine injection': 'H', 'ephedrine': 'H',
  'midodrine': 'H',
  calcipotriol: 'H', calcipotriene: 'H', tacalcitol: 'H', 'maxacalcitol': 'H',
  epalrestat: 'H',
  asparaginase: 'H', 'pegaspargase': 'H', streptokinase: 'H', urokinase: 'H',
  alteplase: 'H', tenecteplase: 'H', reteplase: 'H',
  natamycin: 'H',
  bupivacaine: 'H', ropivacaine: 'H', levobupivacaine: 'H', mepivacaine: 'H',
  'articaine': 'H', 'prilocaine': 'H',
  ozenoxacin: 'H',
  iloperidone: 'H',
  opipramol: 'H',
  azacitidine: 'H', decitabine: 'H', 'nelarabine': 'H', 'clofarabine': 'H',
  'fenoterol': 'H', 'orciprenaline': 'H',

  // Over the counter
  oxaceprol: 'OTC',
  'docosahexanoic acid': 'OTC', 'docosahexaenoic acid': 'OTC',
  'eicosapentaenoic acid': 'OTC', dha: 'OTC', epa: 'OTC',
  'omega 3': 'OTC', 'omega-3': 'OTC', 'krill oil': 'OTC', 'flax seed oil': 'OTC',
  benzydamine: 'OTC', 'choline salicylate ': 'OTC',
  'sodium monofluorophosphate': 'OTC', monofluorophosphate: 'OTC',
  'sodium fluoride': 'OTC', fluoride: 'OTC', 'stannous fluoride': 'OTC',
  fenticonazole: 'OTC', 'flutrimazole': 'OTC',
  'magnesium trisilicate': 'OTC', trisilicate: 'OTC', 'kaolin': 'OTC',
  'attapulgite': 'OTC', 'pectin': 'OTC', 'light kaolin': 'OTC',
  camylofin: 'OTC', 'camylofine': 'OTC', 'perinorm': 'OTC',
  dextrose: 'OTC', glucose: 'OTC', fructose: 'OTC', 'invert sugar': 'OTC',
  'dextrose monohydrate': 'OTC',
  'colloidal silicon dioxide': 'OTC', 'kollidon': 'OTC',
  'beta carotene': 'OTC', 'lutein': 'OTC', 'zeaxanthin': 'OTC',
  'grape seed extract': 'OTC', 'green tea extract': 'OTC',
  'saw palmetto': 'OTC', 'silodosin ': 'H',
  'arginine': 'OTC', 'citrulline': 'OTC', 'ornithine': 'OTC',
  'betaine': 'OTC', 'sodium feredetate': 'OTC', 'iron hydroxide polymaltose': 'OTC',
  'ferric ammonium citrate': 'OTC', 'ferric pyrophosphate': 'OTC',
  'zinc bisglycinate': 'OTC', 'zinc picolinate': 'OTC',
};

/**
 * Normalise a raw composition fragment to a bare drug-substance name:
 * lower-cased, parenthetical dose removed, pharmacopoeia tags dropped, and
 * trailing / leading counter-ion, hydrate and ester tokens stripped.
 * @param {string | null | undefined} raw
 * @returns {string}
 */
export function normalizeSalt(raw) {
  if (!raw) return '';
  let s = String(raw).toLowerCase();
  s = s.replace(/\([^)]*\)/g, ' '); // remove "(500mg)" etc.
  s = s.replace(/\b(?:i\.?p\.?|b\.?p\.?|u\.?s\.?p\.?|ph\.?\s?eur\.?)\b/g, ' ');
  s = s.replace(/\b(?:eq(?:uivalent)?\s+to|equ\.?)\b/g, ' ');
  s = s.replace(/[^a-z0-9\s-]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) return '';
  let parts = s.split(' ');
  while (parts.length > 1 && AFFIX_TOKENS.has(parts[parts.length - 1])) parts.pop();
  while (parts.length > 1 && AFFIX_TOKENS.has(parts[0])) parts.shift();
  return parts.join(' ');
}

/**
 * Look up the Indian drug schedule for a single normalised ingredient.
 * Falls back to matching the first token so multi-word entries such as
 * "insulin glargine" or "sodium valproate" still resolve.
 * @param {string} normalized
 * @returns {Schedule | null}
 */
function lookupSchedule(normalized) {
  if (!normalized) return null;
  if (normalized in SCHEDULE_BY_SALT) return SCHEDULE_BY_SALT[normalized];
  const head = normalized.split(' ')[0];
  if (head && head !== normalized && head in SCHEDULE_BY_SALT) {
    return SCHEDULE_BY_SALT[head];
  }
  return null;
}

const RX_SCHEDULES = new Set(['H', 'H1', 'X']);
const SCHEDULE_RANK = { OTC: 0, H: 1, H1: 2, X: 3 };

/**
 * @typedef {Object} Classification
 * @property {'PRESCRIPTION' | 'OTC'} medicineType
 * @property {Schedule | null} schedule        Highest schedule found (X > H1 > H > OTC), or null if nothing matched.
 * @property {boolean} recognised              True if at least one ingredient was in the table.
 * @property {Array<{ ingredient: string, schedule: Schedule }>} matched
 * @property {string[]} unmatched              Normalised ingredients with no table entry.
 */

/**
 * Classify a medicine from its two raw composition fields.
 * A medicine is PRESCRIPTION if any ingredient is on schedule H, H1 or X.
 * @param {string | null | undefined} comp1
 * @param {string | null | undefined} comp2
 * @param {{ defaultType?: 'PRESCRIPTION' | 'OTC' }} [opts]  Type to use when no ingredient is recognised (default 'OTC').
 * @returns {Classification}
 */
export function classifyMedicineType(comp1, comp2, opts = {}) {
  const defaultType = opts.defaultType === 'PRESCRIPTION' ? 'PRESCRIPTION' : 'OTC';
  const ingredients = [comp1, comp2].map(normalizeSalt).filter(Boolean);

  /** @type {Array<{ ingredient: string, schedule: Schedule }>} */
  const matched = [];
  const unmatched = [];
  /** @type {Schedule | null} */
  let highest = null;

  for (const ingredient of ingredients) {
    const schedule = lookupSchedule(ingredient);
    if (!schedule) {
      unmatched.push(ingredient);
      continue;
    }
    matched.push({ ingredient, schedule });
    if (highest === null || SCHEDULE_RANK[schedule] > SCHEDULE_RANK[highest]) {
      highest = schedule;
    }
  }

  const recognised = matched.length > 0;
  const isRx = highest !== null && RX_SCHEDULES.has(highest);
  const medicineType = recognised ? (isRx ? 'PRESCRIPTION' : 'OTC') : defaultType;

  return { medicineType, schedule: highest, recognised, matched, unmatched };
}

export { SCHEDULE_BY_SALT };
