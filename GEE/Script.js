// ================================================================
// INTERLAKEN, SWITZERLAND
// DETEKSI PERUBAHAN BANGUNAN vs VEGETASI (2020 -> 2025)
// Sentinel-2 SR Harmonized + Random Forest + NDVI & NDBI
// Class encoding: 0 = building, 1 = vegetasi
// ================================================================


// SECTION 0 — BASEMAP STYLE (dark mode)

var darkBasemapStyle = [
  {elementType: 'geometry', stylers: [{color: '#1a1a2e'}]},
  {elementType: 'labels.text.stroke', stylers: [{color: '#1a1a2e'}]},
  {elementType: 'labels.text.fill', stylers: [{color: '#8ec3b9'}]},
  {featureType: 'administrative', elementType: 'geometry', stylers: [{color: '#4b6878'}]},
  {featureType: 'landscape', elementType: 'geometry', stylers: [{color: '#2c3e50'}]},
  {featureType: 'poi', elementType: 'geometry', stylers: [{color: '#283d3b'}]},
  {featureType: 'road', elementType: 'geometry', stylers: [{color: '#304a7d'}]},
  {featureType: 'road', elementType: 'geometry.stroke', stylers: [{color: '#0e1626'}]},
  {featureType: 'water', elementType: 'geometry', stylers: [{color: '#0e1626'}]}
];
Map.setOptions('Dark GIS', {'Dark GIS': darkBasemapStyle});


// SECTION 1 — AOI & IMPORT GROUND TRUTH (KEDUA TAHUN)
var interlakenBoundary = ee.FeatureCollection('projects/ks-final-project/assets/Interlaken_final');
var aoi = interlakenBoundary.geometry();

Map.centerObject(aoi, 14);
Map.addLayer(aoi, {color: 'red'}, 'AOI Interlaken');
print('AOI');
print('Luas AOI (km2):', aoi.area().divide(1e6));

var gtNDVI2020 = ee.FeatureCollection('projects/ks-final-project/assets/GroundTruth_NDVI_2020');
var gtNDBI2020 = ee.FeatureCollection('projects/ks-final-project/assets/GroundTruth_NDBI_2020');
var gtNDVI2025 = ee.FeatureCollection('projects/ks-final-project/assets/GroundTruthNDVI_2025');
var gtNDBI2025 = ee.FeatureCollection('projects/ks-final-project/assets/GroundTruthNDBI_2025');

print('VALIDASI GROUND TRUTH MENTAH (sebelum digabung)');
print('gtNDVI2020:', gtNDVI2020.size(), gtNDVI2020.aggregate_histogram('class'));
print('gtNDBI2020:', gtNDBI2020.size(), gtNDBI2020.aggregate_histogram('class'));
print('gtNDVI2025:', gtNDVI2025.size(), gtNDVI2025.aggregate_histogram('class'));
print('gtNDBI2025:', gtNDBI2025.size(), gtNDBI2025.aggregate_histogram('class'));

var allPoints2020 = gtNDVI2020.merge(gtNDBI2020);
var allPoints2025 = gtNDVI2025.merge(gtNDBI2025);

print('VALIDASI GROUND TRUTH GABUNGAN PER TAHUN');
print('Total titik 2020:', allPoints2020.size(), allPoints2020.aggregate_histogram('class'));
print('Total titik 2025:', allPoints2025.size(), allPoints2025.aggregate_histogram('class'));


// SECTION 2 — KOMPOSIT SENTINEL-2 (PARAMETER IDENTIK KEDUA TAHUN)
var CLOUD_MAX = 20;
var MONTH_START = '-07-01';
var MONTH_END = '-08-31';
var COLLECTION = 'COPERNICUS/S2_SR_HARMONIZED';
var RESOLUTION = 10;

function maskS2clouds(image) {
  var scl = image.select('SCL');
  var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)).and(scl.neq(11));
  return image.updateMask(mask).divide(10000).copyProperties(image, ['system:time_start']);
}

function getComposite(year) {
  return ee.ImageCollection(COLLECTION)
    .filterBounds(aoi)
    .filterDate(year + MONTH_START, year + MONTH_END)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', CLOUD_MAX))
    .map(maskS2clouds)
    .median()
    .clip(aoi);
}

var composite2020 = getComposite('2020');
var composite2025 = getComposite('2025');

Map.addLayer(composite2020, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3}, 'RGB 2020', false);
Map.addLayer(composite2025, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3}, 'RGB 2025', false);

print('TABEL PARAMETER PREPROCESSING');
print(ee.Dictionary({
  koleksi: COLLECTION,
  rentang_tanggal_2020: '2020-07-01 s/d 2020-08-31',
  rentang_tanggal_2025: '2025-07-01 s/d 2025-08-31',
  cloud_mask: 'SCL (buang kelas 3,8,9,10,11)',
  cloud_threshold: CLOUD_MAX + '%',
  metode_komposit: 'median',
  resolusi: RESOLUTION + ' m',
  sumber_batas_admin: 'asset Interlaken_final'
}));


// SECTION 3 — NDVI, NDBI & FEATURE STACK (STRUKTUR IDENTIK)
var FEATURES = ['B2', 'B3', 'B4', 'B8', 'B11', 'B12', 'NDVI', 'NDBI'];

function buildStack(composite) {
  var ndvi = composite.normalizedDifference(['B8', 'B4']).rename('NDVI');
  var ndbi = composite.normalizedDifference(['B11', 'B8']).rename('NDBI');
  return composite.addBands(ndvi).addBands(ndbi).select(FEATURES);
}

var stack2020 = buildStack(composite2020);
var stack2025 = buildStack(composite2025);

var ndviVis = {min: -0.2, max: 0.8, palette: ['#8B4513', '#D2B48C', '#FFF7BC', '#D9EF8B', '#78C679', '#1A9850', '#00441B']};
var ndbiVis = {min: -0.5, max: 0.5, palette: ['#2166AC', '#67A9CF', '#D1E5F0', '#F7F7F7', '#FDDBC7', '#EF8A62', '#B2182B']};

Map.addLayer(stack2020.select('NDVI'), ndviVis, 'NDVI 2020', false);
Map.addLayer(stack2025.select('NDVI'), ndviVis, 'NDVI 2025', false);
Map.addLayer(stack2020.select('NDBI'), ndbiVis, 'NDBI 2020', false);
Map.addLayer(stack2025.select('NDBI'), ndbiVis, 'NDBI 2025', false);

print('VALIDASI FEATURE STACK');
print('Band stack2020:', stack2020.bandNames());
print('Band stack2025:', stack2025.bandNames());


// SECTION 4 — SAMPLING NILAI FITUR DI TITIK GROUND TRUTH
var samples2020 = stack2020.sampleRegions({collection: allPoints2020, properties: ['class'], scale: RESOLUTION, geometries: true, tileScale: 4});
var samples2025 = stack2025.sampleRegions({collection: allPoints2025, properties: ['class'], scale: RESOLUTION, geometries: true, tileScale: 4});

print('VALIDASI SAMPLING');
print('Jumlah sample 2020:', samples2020.size());
print('Jumlah sample 2025:', samples2025.size());
print('Contoh 1 sample 2020:', samples2020.first());
print('Contoh 1 sample 2025:', samples2025.first());


// SECTION 5 — SPLIT 70:30 PER TAHUN & KELAS, LALU GABUNGKAN
var SEED = 42;
var SPLIT_RATIO = 0.7;

function splitByClass(samples, ratio, seed) {
  var withRandom = samples.randomColumn('random', seed);
  var cls0 = withRandom.filter(ee.Filter.eq('class', 0));
  var cls1 = withRandom.filter(ee.Filter.eq('class', 1));
  return {
    train: cls0.filter(ee.Filter.lt('random', ratio)).merge(cls1.filter(ee.Filter.lt('random', ratio))),
    test: cls0.filter(ee.Filter.gte('random', ratio)).merge(cls1.filter(ee.Filter.gte('random', ratio)))
  };
}

var split2020 = splitByClass(samples2020, SPLIT_RATIO, SEED);
var split2025 = splitByClass(samples2025, SPLIT_RATIO, SEED);

var trainingFinal = split2020.train.merge(split2025.train);
var testingFinal = split2020.test.merge(split2025.test);

print('VALIDASI SPLIT TRAINING/TESTING');
print('Training 2020:', split2020.train.size(), '| Testing 2020:', split2020.test.size());
print('Training 2025:', split2025.train.size(), '| Testing 2025:', split2025.test.size());
print('TOTAL Training gabungan:', trainingFinal.size());
print('TOTAL Testing gabungan:', testingFinal.size());
print('Distribusi kelas training:', trainingFinal.aggregate_histogram('class'));
print('Distribusi kelas testing:', testingFinal.aggregate_histogram('class'));


// SECTION 6 — LATIH SATU RANDOM FOREST (MODEL GABUNGAN 2020+2025)
var NUM_TREES = 150;

var classifierFinal = ee.Classifier.smileRandomForest({numberOfTrees: NUM_TREES, seed: SEED})
  .train({features: trainingFinal, classProperty: 'class', inputProperties: FEATURES});

print('KONFIGURASI MODEL');
print(ee.Dictionary({
  algoritma: 'Random Forest (smileRandomForest)',
  jumlah_trees: NUM_TREES,
  seed: SEED,
  fitur: FEATURES,
  jumlah_training: trainingFinal.size(),
  data_training: '2020 + 2025 digabung'
}));


// SECTION 7 — EVALUASI MODEL (HANYA PAKAI TESTING DATA)
var testClassified = testingFinal.classify(classifierFinal);
var confMatrix = testClassified.errorMatrix('class', 'classification');

print('EVALUASI MODEL');
print('Jumlah testing data:', testingFinal.size());
print('Confusion Matrix:', confMatrix);

// VISUAL CONFUSION MATRIX
confMatrix.array().evaluate(function(cm){

  var panel = ui.Panel({
    style:{
      position:'top-right',
      padding:'12px',
      width:'320px',
      backgroundColor:'rgba(255,255,255,0.95)'
    }
  });

  panel.add(ui.Label('CONFUSION MATRIX', {
    fontWeight:'bold',
    fontSize:'16px',
    color:'#222222'
  }));

  panel.add(ui.Label('Actual (Baris) vs Predicted (Kolom)', {
    fontSize:'11px',
    color:'#666666',
    margin:'0 0 10px 0'
  }));


  // Header
  panel.add(
    ui.Panel([
      ui.Label('', {width:'90px'}),
      ui.Label('Building',{
        width:'90px',
        textAlign:'center',
        fontWeight:'bold'
      }),
      ui.Label('Vegetasi',{
        width:'90px',
        textAlign:'center',
        fontWeight:'bold'
      })
    ], ui.Panel.Layout.Flow('horizontal'))
  );


  // Row Building
  panel.add(
    ui.Panel([

      ui.Label('Building',{
        width:'90px',
        fontWeight:'bold'
      }),

      ui.Label(cm[0][0].toString(),{
        width:'90px',
        textAlign:'center',
        backgroundColor:'#A6C261',
        color:'black',
        padding:'8px'
      }),

      ui.Label(cm[0][1].toString(),{
        width:'90px',
        textAlign:'center',
        backgroundColor:'#EFE9D7',
        color:'black',
        padding:'8px'
      })

    ], ui.Panel.Layout.Flow('horizontal'))
  );


  // Row Vegetasi
  panel.add(
    ui.Panel([

      ui.Label('Vegetasi',{
        width:'90px',
        fontWeight:'bold'
      }),

      ui.Label(cm[1][0].toString(),{
        width:'90px',
        textAlign:'center',
        backgroundColor:'#EFE9D7',
        color:'black',
        padding:'8px'
      }),

      ui.Label(cm[1][1].toString(),{
        width:'90px',
        textAlign:'center',
        backgroundColor:'#A6C261',
        color:'black',
        padding:'8px'
      })

    ], ui.Panel.Layout.Flow('horizontal'))
  );

  panel.add(ui.Label(
    '🟩 Hijau = Prediksi Benar\n⬜ Krem = Prediksi Salah',
    {
      margin:'12px 0 0 0',
      fontSize:'11px',
      color:'#555555'
    }
  ));

  Map.add(panel);

});
print('Overall Accuracy:', confMatrix.accuracy());
print('Kappa:', confMatrix.kappa());
print('Producers Accuracy / Recall [building, vegetasi]:', confMatrix.producersAccuracy());
print('Consumers Accuracy / Precision [building, vegetasi]:', confMatrix.consumersAccuracy());

var recallBuilding = confMatrix.producersAccuracy().get([0, 0]);
var precisionBuilding = confMatrix.consumersAccuracy().get([0, 0]);
var f1Building = ee.Number(2).multiply(precisionBuilding).multiply(recallBuilding)
  .divide(ee.Number(precisionBuilding).add(recallBuilding));

var recallVeg = confMatrix.producersAccuracy().get([1, 0]);
var precisionVeg = confMatrix.consumersAccuracy().get([0, 1]);
var f1Veg = ee.Number(2).multiply(precisionVeg).multiply(recallVeg)
  .divide(ee.Number(precisionVeg).add(recallVeg));

print('Kelas Building');
print('Precision:', precisionBuilding, '| Recall:', recallBuilding, '| F1:', f1Building);
print('Kelas Vegetasi');
print('Precision:', precisionVeg, '| Recall:', recallVeg, '| F1:', f1Veg);

var accClient = confMatrix.accuracy();
accClient.evaluate(function (acc) {
  print('CEK KEWAJARAN AKURASI');
  if (acc >= 0.999) {
    print('PERINGATAN: Accuracy ' + (acc * 100).toFixed(1) + '% -- terlalu sempurna, cek ground truth.');
  } else if (acc < 0.7) {
    print('PERINGATAN: Accuracy ' + (acc * 100).toFixed(1) + '% -- cukup rendah, cek label ground truth.');
  } else {
    print('OK: Accuracy ' + (acc * 100).toFixed(1) + '% -- masuk rentang wajar untuk dilaporkan.');
  }
});


// SECTION 8 — KLASIFIKASI KEDUA TAHUN (MODEL YANG SAMA)
var classified2020 = stack2020.classify(classifierFinal).rename('classified');
var classified2025 = stack2025.classify(classifierFinal).rename('classified');

// Warna 
var classVis = {
  min: 0,
  max: 1,
  palette: [
    '#7D2826',   // Building
    '#A6C261'    // Vegetasi
  ]
};
Map.addLayer(classified2020, classVis, 'Klasifikasi 2020', true, 0.85);
Map.addLayer(classified2025, classVis, 'Klasifikasi 2025', true, 0.85);


// SECTION 9 — HITUNG LUAS PER KELAS PER TAHUN
function calculateArea(classifiedImage, classValue) {
  var mask = classifiedImage.eq(classValue);
  var areaImage = mask.multiply(ee.Image.pixelArea());
  var stats = areaImage.reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi, scale: RESOLUTION, maxPixels: 1e13, tileScale: 4});
  return ee.Number(stats.get('classified')).divide(10000);
}

var luasKota = aoi.area().divide(10000);
var areaBuilding2020 = calculateArea(classified2020, 0);
var areaVegetasi2020 = calculateArea(classified2020, 1);
var areaBuilding2025 = calculateArea(classified2025, 0);
var areaVegetasi2025 = calculateArea(classified2025, 1);

print('LUAS PER KELAS');
print('Luas kota total (ha):', luasKota);
print('2020 - Building (ha):', areaBuilding2020, '| %:', areaBuilding2020.divide(luasKota).multiply(100));
print('2020 - Vegetasi (ha):', areaVegetasi2020, '| %:', areaVegetasi2020.divide(luasKota).multiply(100));
print('2025 - Building (ha):', areaBuilding2025, '| %:', areaBuilding2025.divide(luasKota).multiply(100));
print('2025 - Vegetasi (ha):', areaVegetasi2025, '| %:', areaVegetasi2025.divide(luasKota).multiply(100));


// SECTION 10 — CHANGE MAP (4 KATEGORI) -- TARGET = BUILDING
var TARGET_CLASS = 0;
var changeCombo = classified2020.multiply(2).add(classified2025).rename('change');

// Warna pastel untuk change map
var changeVis = {
  min:0,
  max:3,
  palette:[
    '#7D2826',  // Tetap Building
    '#EFE9D7',  // Building -> Vegetasi (Loss)
    '#898861',  // Vegetasi -> Building (Gain)
    '#A6C261'   // Tetap Vegetasi
  ]
};
Map.addLayer(changeCombo, changeVis, 'Change Map (0-0,0-1,1-0,1-1)', true, 0.85);
Export.image.toDrive({
  image: changeCombo,
  description: 'Interlaken_ChangeMap_2020_2025',
  folder: 'GEE_UAS_Interlaken',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});

var gainMask = changeCombo.eq(2);
var lossMask = changeCombo.eq(1);
var stableTargetMask = changeCombo.eq(0);
var stableNonTargetMask = changeCombo.eq(3);

function areaFromMask(mask) {
  var areaImage = mask.selfMask().multiply(ee.Image.pixelArea());
  var stats = areaImage.reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi, scale: RESOLUTION, maxPixels: 1e13, tileScale: 4});
  return ee.Number(stats.get('change')).divide(10000);
}

var areaGain = areaFromMask(gainMask);
var areaLoss = areaFromMask(lossMask);
var areaStableTarget = areaFromMask(stableTargetMask);
var areaStableNonTarget = areaFromMask(stableNonTargetMask);
var netChange = areaBuilding2025.subtract(areaBuilding2020);
var pctChange = netChange.divide(areaBuilding2020).multiply(100);
var netChangeVeg = areaVegetasi2025.subtract(areaVegetasi2020);

print('CHANGE DETECTION (target = building)');
print('Luas GAIN building (vegetasi->building), ha:', areaGain);
print('Luas LOSS building (building->vegetasi), ha:', areaLoss);
print('Luas tetap building, ha:', areaStableTarget);
print('Luas tetap vegetasi, ha:', areaStableNonTarget);
print('Net change building 2020->2025 (ha):', netChange);
print('Persentase perubahan thd luas building 2020 (%):', pctChange);


// SECTION 11 — VECTORIZE UNTUK WEBGIS (GeoJSON)
var MIN_PATCH_PIXELS = 4;

function vectorizeClean(mask, label) {
  var connected = mask.selfMask().connectedPixelCount(MIN_PATCH_PIXELS + 1, true);
  var cleaned = mask.updateMask(connected.gte(MIN_PATCH_PIXELS));
  var vectors = cleaned.selfMask().reduceToVectors({geometry: aoi, scale: RESOLUTION, geometryType: 'polygon', maxPixels: 1e13, labelProperty: 'value', tileScale: 4});
  return vectors.map(function (f) { return f.set('kategori', label).simplify(10); });
}

var target2020Vec = vectorizeClean(classified2020.eq(TARGET_CLASS), 'target_2020');
var target2025Vec = vectorizeClean(classified2025.eq(TARGET_CLASS), 'target_2025');
var gainVec = vectorizeClean(gainMask, 'gain');
var lossVec = vectorizeClean(lossMask, 'loss');

print('VALIDASI GEOMETRY');
print('Polygon target 2020:', target2020Vec.size());
print('Polygon target 2025:', target2025Vec.size());
print('Polygon gain:', gainVec.size());
print('Polygon loss:', lossVec.size());

Export.table.toDrive({collection: target2020Vec, description: 'Target_2020_GeoJSON', folder: 'GEE_UAS_Interlaken', fileFormat: 'GeoJSON'});
Export.table.toDrive({collection: target2025Vec, description: 'Target_2025_GeoJSON', folder: 'GEE_UAS_Interlaken', fileFormat: 'GeoJSON'});
Export.table.toDrive({collection: gainVec, description: 'Gain_GeoJSON', folder: 'GEE_UAS_Interlaken', fileFormat: 'GeoJSON'});
Export.table.toDrive({collection: lossVec, description: 'Loss_GeoJSON', folder: 'GEE_UAS_Interlaken', fileFormat: 'GeoJSON'});


// SECTION 12 — EXPORT TAMBAHAN
Export.image.toDrive({image: classified2020, description: 'Interlaken_Classified_2020', folder: 'GEE_UAS_Interlaken', scale: RESOLUTION, region: aoi, maxPixels: 1e9});
Export.image.toDrive({image: classified2025, description: 'Interlaken_Classified_2025', folder: 'GEE_UAS_Interlaken', scale: RESOLUTION, region: aoi, maxPixels: 1e9});
Export.table.toDrive({collection: trainingFinal, description: 'TrainingSet_Gabungan_2020_2025', folder: 'GEE_UAS_Interlaken', fileFormat: 'CSV'});
Export.table.toDrive({collection: testingFinal, description: 'TestingSet_Gabungan_2020_2025', folder: 'GEE_UAS_Interlaken', fileFormat: 'CSV'});


// SECTION 13 — FEATURE IMPORTANCE
var importance = ee.Dictionary(classifierFinal.explain().get('importance'));

print('FEATURE IMPORTANCE');
print(importance);

var chartImportance = ui.Chart.array.values({
  array: ee.Array(importance.values()),
  axis: 0,
  xLabels: importance.keys()
})
.setChartType('BarChart')
.setOptions({
  title: 'Feature Importance Random Forest',
  titleTextStyle: {
    color: '#310E10',
    fontSize: 16,
    bold: true
  },
  backgroundColor: '#F4E3B2',
  chartArea:{
    backgroundColor:'#F4E3B2'
  },
  hAxis:{
    title:'Importance',
    textStyle:{color:'#310E10'},
    titleTextStyle:{color:'#310E10'}
  },
  vAxis:{
    textStyle:{color:'#310E10'}
  },
  colors:['#74070E'],
  legend:{position:'none'}
});

print(chartImportance);


// SECTION 14 — GRAFIK PERBANDINGAN LUAS & PERUBAHAN
var chartArea = ui.Chart.array.values({
  array: ee.Array([
    [areaBuilding2020, areaBuilding2025],
    [areaVegetasi2020, areaVegetasi2025]
  ]),
  axis: 1,
  xLabels: ['2020','2025']
})
.setChartType('ColumnChart')
.setSeriesNames(['Building','Vegetasi'])
.setOptions({

  title:'Perbandingan Luas Tutupan Lahan',

  titleTextStyle:{
    color:'#310E10',
    bold:true,
    fontSize:16
  },

  backgroundColor:'#F4E3B2',

  chartArea:{
    backgroundColor:'#F4E3B2'
  },

  hAxis:{
    title:'Tahun',
    textStyle:{color:'#310E10'},
    titleTextStyle:{color:'#310E10'}
  },

  vAxis:{
    title:'Luas (ha)',
    textStyle:{color:'#310E10'},
    titleTextStyle:{color:'#310E10'}
  },

  series:{
    0:{color:'#74070E'},
    1:{color:'#45462A'}
  }

});

print(chartArea);

// ================================================================
// LINE CHART — PERUBAHAN LUAS BUILDING & VEGETASI
// ================================================================

var lineChart = ui.Chart.array.values({
  array: ee.Array([
    [areaBuilding2020, areaBuilding2025],
    [areaVegetasi2020, areaVegetasi2025]
  ]),
  axis: 1,
  xLabels: ['2020','2025']
})
.setChartType('LineChart')
.setSeriesNames(['Building','Vegetasi'])
.setOptions({
  title: 'Land Cover Change (2020 - 2025)',
  curveType: 'function',
  lineWidth: 4,
  pointSize: 8,

  series:{
    0:{color:'#74070E'},
    1:{color:'#45462A'}
  },

  hAxis:{
    title:'Year',
    textStyle:{fontSize:12}
  },

  vAxis:{
    title:'Area (ha)',
    textStyle:{fontSize:12}
  },

  legend:{
    position:'bottom'
  },

  backgroundColor:'#F4E3B2'
});

print(lineChart);


var buildingTrend = ui.Chart.array.values({
  array: ee.Array([[areaBuilding2020, areaBuilding2025]]),
  axis:1,
  xLabels:['2020','2025']
})
.setChartType('LineChart')
.setSeriesNames(['Building'])
.setOptions({
  title:'Building Area Trend',
  lineWidth:5,
  pointSize:9,
  series:{
    0:{color:'#74070E'}
  },
  backgroundColor:'#F4E3B2',
  legend:{position:'none'},
  hAxis:{title:'Year'},
  vAxis:{title:'Area (ha)'}
});

print(buildingTrend);

var vegetationTrend = ui.Chart.array.values({
  array: ee.Array([[areaVegetasi2020, areaVegetasi2025]]),
  axis:1,
  xLabels:['2020','2025']
})
.setChartType('LineChart')
.setSeriesNames(['Vegetation'])
.setOptions({
  title:'Vegetation Area Trend',
  lineWidth:5,
  pointSize:9,
  series:{
    0:{color:'#45462A'}
  },
  backgroundColor:'#F4E3B2',
  legend:{position:'none'},
  hAxis:{title:'Year'},
  vAxis:{title:'Area (ha)'}
});

print(vegetationTrend);

// SECTION 15 — RINGKASAN HASIL AKHIR
print('RINGKASAN HASIL AKHIR');
print('Luas Building 2020 (ha):', areaBuilding2020, '| 2025 (ha):', areaBuilding2025, '| Perubahan (ha):', netChange);
print('Luas Vegetasi 2020 (ha):', areaVegetasi2020, '| 2025 (ha):', areaVegetasi2025, '| Perubahan (ha):', netChangeVeg);
print('Gain Building (ha):', areaGain, '| Loss Building (ha):', areaLoss);
print('Persentase perubahan Building (%):', pctChange);



// SECTION 16 — UI PANEL: JUDUL & LEGEND

// TITLE
var titlePanel = ui.Panel({
  style: {
    position: 'top-left',
    padding: '10px 16px',
    backgroundColor: 'rgba(255,255,255,0.92)'
  }
});

titlePanel.add(ui.Label('Interlaken — Building vs Vegetation Change', {
  fontWeight: 'bold',
  fontSize: '16px',
  color: '#222222',
  margin: '0 0 2px 0'
}));

titlePanel.add(ui.Label('Random Forest Classification | 2020 → 2025', {
  fontSize: '12px',
  color: '#555555',
  margin: '0'
}));

Map.add(titlePanel);


// LEGEND FUNCTION
function legendRow(color, label) {

  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 8px 6px 0',
      border: '1px solid #888'
    }
  });

  var description = ui.Label({
    value: label,
    style: {
      fontSize: '12px',
      color: '#000000',
      margin: '0 0 6px 0'
    }
  });

  return ui.Panel(
    [colorBox, description],
    ui.Panel.Layout.Flow('horizontal')
  );
}


// LEGEND KLASIFIKASI
var legendClass = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '12px',
    backgroundColor: 'rgba(255,255,255,0.92)'
  }
});

legendClass.add(ui.Label('Klasifikasi Lahan', {
  fontWeight: 'bold',
  fontSize: '14px',
  color: '#000000',
  margin: '0 0 8px 0'
}));

legendClass.add(legendRow('#7D2826', 'Building'));
legendClass.add(legendRow('#A6C261', 'Vegetasi'));

Map.add(legendClass);


// LEGEND CHANGE MAP
var legendChange = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '12px',
    backgroundColor: 'rgba(255,255,255,0.92)'
  }
});

legendChange.add(ui.Label('Change Detection', {
  fontWeight: 'bold',
  fontSize: '14px',
  color: '#000000',
  margin: '0 0 8px 0'
}));

legendChange.add(legendRow('#7D2826', 'Tetap Building'));
legendChange.add(legendRow('#EFE9D7', 'Building → Vegetasi (Loss)'));
legendChange.add(legendRow('#898861', 'Vegetasi → Building (Gain)'));
legendChange.add(legendRow('#A6C261', 'Tetap Vegetasi'));

Map.add(legendChange);

// SECTION 17 — Export
Export.image.toDrive({
  image: classified2020,
  description: 'Interlaken_Classified_2020',
  folder: 'GEE_UAS_Interlaken',
  fileNamePrefix: 'Interlaken_Classified_2020',
  region: aoi,
  scale: 10,
  crs: 'EPSG:32632',
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF'
});


Export.image.toDrive({
  image: classified2025,
  description: 'Interlaken_Classified_2025',
  folder: 'GEE_UAS_Interlaken',
  fileNamePrefix: 'Interlaken_Classified_2025',
  region: aoi,
  scale: 10,
  crs: 'EPSG:32632',
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF'
});


Export.image.toDrive({
  image: composite2020.select(['B4','B3','B2']),
  description: 'Sentinel_RGB_2020',
  folder: 'GEE_UAS_Interlaken',
  fileNamePrefix: 'Sentinel_RGB_2020',
  region: aoi,
  scale: 10,
  crs: 'EPSG:32632',
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF'
});

Export.image.toDrive({
  image: composite2025.select(['B4','B3','B2']),
  description: 'Sentinel_RGB_2025',
  folder: 'GEE_UAS_Interlaken',
  fileNamePrefix: 'Sentinel_RGB_2025',
  region: aoi,
  scale: 10,
  crs: 'EPSG:32632',
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF'
});

Export.image.toDrive({
  image: changeCombo,
  description: 'Change_Map_2020_2025',
  folder: 'GEE_UAS_Interlaken',
  fileNamePrefix: 'Change_Map_2020_2025',
  region: aoi,
  scale: 10,
  crs: 'EPSG:32632',
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF'
});
