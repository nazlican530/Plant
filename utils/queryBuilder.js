// ===== ADVANCED QUERY BUILDER UTILITY =====
// Gelişmiş sorgu oluşturucu modülü
// Sort, Filter, Pagination, Search özelliklerini içeren kapsamlı sistem
//
// Bu modül herhangi bir Mongoose model'i ile kullanılabilir
// Enterprise-level uygulamalarda standart olarak kullanılan yapı
const Categories = require('../models/Categories');

/**
 * Advanced Query Builder - Gelişmiş Sorgu Oluşturucu
 * 
 * @param {Object} Model - Mongoose model (Plants, Users vb.)
 * @param {Object} req - Express request objesi (query parametreleri için)
 * @param {Object} options - Ek konfigürasyon seçenekleri
 * @returns {Object} - Professional formatlı response (data + pagination bilgileri)
 * 
 * Kullanım örneği:
 * const result = await queryBuilder(Plants, req, {
 *     allowedSortFields: ['name', 'status'],
 *     allowedFilterFields: ['name', 'status'],
 *     searchFields: ['name', 'description']
 * });
 */
const queryBuilder = async (Model, req, options = {}) => {
    try {
        // ===== KONFİGÜRASYON AYARLARI =====
        // Varsayılan ayarlar tanımlanıyor
        const defaults = {
            defaultLimit: 100,           // Varsayılan sayfa boyutu
            maxLimit: 100,             // Maksimum izin verilen sayfa boyutu (güvenlik)
            defaultSort: 'createdAt',   // Varsayılan sıralama field'ı
            allowedSortFields: [],      // Boş array = tüm field'lara sıralama izni
            allowedFilterFields: []     // Boş array = tüm field'lara filtreleme izni
        };

        // Kullanıcı ayarları ile varsayılan ayarları birleştir
        // JavaScript spread operator (...) kullanımı
        const config = { ...defaults, ...options };

        // ===== 1. PAGINATION (SAYFALAMA) PARAMETRELERİ =====
        // URL'den gelen sayfa parametrelerini parse et ve validate et
        // Örnek: ?page=2&limit=10
        
        // Math.max ile minimum değer 1 olmasını garanti ediyoruz
        // parseInt ile string'i number'a çeviriyoruz
        // || operator ile varsayılan değer atanıyor
        const page = Math.max(1, parseInt(req.query.page) || 1);
        
        // Limit değeri için güvenlik kontrolü
        // Math.min ile maksimum limit aşılmasını engelliyoruz
        // Math.max ile minimum 1 değerini garanti ediyoruz
        const limit = Math.min(
            Math.max(1, parseInt(req.query.limit) || config.defaultLimit),
            config.maxLimit
        );
        
        // MongoDB skip değeri hesaplama
        // Skip: Kaç kayıt atlanacak (pagination için gerekli)
        // Örnek: Sayfa 2, limit 10 → skip = (2-1) * 10 = 10
        const skip = (page - 1) * limit;

        // ===== 2. SORTING (SIRALAMA) İŞLEMİ =====
        // URL'den gelen sort parametresini parse et
        // Örnek: ?sort=name (artan), ?sort=-name (azalan)
        let sortObject = {};
        
        if (req.query.sort) {
            const sortField = req.query.sort;
            
            // - (eksi) işareti azalan sıralama anlamına gelir
            const isDescending = sortField.startsWith('-');
            
            // - işaretini kaldırarak gerçek field ismini al
            const fieldName = isDescending ? sortField.substring(1) : sortField;
            
            // Güvenlik kontrolü: Sadece izin verilen field'larda sıralama
            if (config.allowedSortFields.length === 0 || 
                config.allowedSortFields.includes(fieldName)) {
                // MongoDB sort objesi: 1 = artan (A-Z), -1 = azalan (Z-A)
                sortObject[fieldName] = isDescending ? -1 : 1;
            } else {
                // İzin verilmeyen field ise varsayılan sıralamayı kullan
                sortObject[config.defaultSort] = -1;
            }
        } else {
            // Sort parametresi yoksa varsayılan sıralama
            // Genellikle en yeni kayıtlar önce gelsin diye -1 (descending)
            sortObject[config.defaultSort] = -1;
        }

        // ===== 3. FILTERING (FİLTRELEME) İŞLEMİ =====
        // URL'den gelen filter parametrelerini işle
        // Örnek: ?filter[name]=john&filter[status]=active
        // Örnek: ?filter[name]=john,jane (çoklu değer)
        let filterObject = {};
        
        // Express.js nested parameter parsing sorunu için manuel parse
        // filter[key]=value formatını doğru şekilde parse ediyoruz
        let filterToProcess = req.query.filter;
        
        if (!filterToProcess || typeof filterToProcess !== 'object') {
            // Manuel parsing: filter[key]=value parametrelerini bul
            const manualFilter = {};
            Object.keys(req.query).forEach(key => {
                // Regex ile filter[...] formatını yakalıyoruz
                const match = key.match(/^filter\[(.+)\]$/);
                if (match) {
                    const fieldName = match[1];
                    manualFilter[fieldName] = req.query[key];
                }
            });
            
            // Manuel parse başarılıysa kullan
            if (Object.keys(manualFilter).length > 0) {
                filterToProcess = manualFilter;
            }
        }
if (req.query.categories) {
                    const categoriesName = req.query.categories.trim();
        
                    const categories = await Categories.findOne({ name: categoriesName }).collation({
                        locale: 'tr', strength: 1 // strength: 1 → sadece harf eşleşmesi, büyük/küçük farkı dikkate alınmaz
                    });
        
                    if (categories) {
                        filterObject["categoriesIds"] = categories._id;  
                        console.log(`Kategori bulundu: ${categoriesName} (${categories._id})`);
                    } 
                }

        // Filter objesi varsa işleme devam et
        if (filterToProcess && typeof filterToProcess === 'object') {
            Object.keys(filterToProcess).forEach(field => {
                // Güvenlik kontrolü: Sadece izin verilen field'larda filtreleme
                if (config.allowedFilterFields.length === 0 || 
                    config.allowedFilterFields.includes(field)) {
                    
                    const filterValue = filterToProcess[field];
                    
                    // Çoklu değer kontrolü (virgülle ayrılmış)
                    // Örnek: filter[status]=active,inactive
                    if (typeof filterValue === 'string' && filterValue.includes(',')) {
                        // Virgülle ayrılmış değerleri parse et
                        const values = filterValue.split(',').map(v => v.trim());
                        // MongoDB $in operatörü: array içindeki değerlerden herhangi biri
                        filterObject[field] = { $in: values };
                    } else {
                        // Tek değer filtreleme
                        if (typeof filterValue === 'string') {
                            // Status gibi enum field'lar için tam eşleşme
                            if (field === 'status') {
                                filterObject[field] = filterValue;
                            } else {
                                // Text field'lar için kısmi eşleşme (contains)
                                // Special characters'ları escape et (güvenlik)
                                const escapedValue = filterValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                // MongoDB regex: case insensitive search
                                filterObject[field] = { 
                                    $regex: new RegExp(escapedValue, 'i') 
                                };
                            }
                        } else {
                            // Non-string değerler (number, boolean vb.) için direkt eşleşme
                            filterObject[field] = filterValue;
                        }
                    }
                }
            });
        }

        // ===== 4. GLOBAL SEARCH (GENEL ARAMA) =====
        // Birden fazla field'da arama yapma özelliği
        // Örnek: ?search=bitki (name, description field'larında ara)
        if (req.query.search && options.searchFields) {
            const searchTerm = req.query.search;
            
            // Her search field için regex condition oluştur
            const searchConditions = options.searchFields.map(field => ({
                [field]: { $regex: new RegExp(searchTerm, 'i') }
            }));
            
            // MongoDB $or operatörü: Şartlardan herhangi biri sağlanırsa match
            // Mevcut filter'lar ile birleştiriliyor
            filterObject.$or = searchConditions;
        }

        // ===== 5. DATE RANGE FILTERING (TARİH ARALIĞI FİLTRELEME) =====
        // Belirli tarih aralığında kayıtları getirme
        // Örnek: ?date_from=2024-01-01&date_to=2024-12-31
        if (req.query.date_from || req.query.date_to) {
            // Hangi field'da tarih kontrolü yapılacak (varsayılan: createdAt)
            const dateField = options.dateField || 'createdAt';
            filterObject[dateField] = {};
            
            // Başlangıç tarihi kontrolü
            if (req.query.date_from) {
                // MongoDB $gte: greater than or equal (büyük eşit)
                filterObject[dateField].$gte = new Date(req.query.date_from);
            }
            
            // Bitiş tarihi kontrolü  
            if (req.query.date_to) {
                // MongoDB $lte: less than or equal (küçük eşit)
                filterObject[dateField].$lte = new Date(req.query.date_to);
            }
        }

        // ===== 6. POPULATE (İLİŞKİLİ VERİLERİ GETİRME) =====
        // MongoDB populate: İlişkili collection'lardan veri çekme
        // SQL'deki JOIN işlemine benzer
        let query = Model.find(filterObject);
        
        if (options.populate) {
            if (Array.isArray(options.populate)) {
                // Birden fazla populate
                options.populate.forEach(pop => {
                    query = query.populate(pop);
                });
            } else {
                // Tek populate
                query = query.populate(options.populate);
            }
        }

        // ===== 7. QUERY'LERİ ÇALIŞTIRMA =====
        // İki ayrı query çalıştırıyoruz: count ve data
        
        // Toplam kayıt sayısı (pagination için gerekli)
        // countDocuments sadece sayıyı döndürür, data getirmez (performans)
        const totalCount = await Model.countDocuments(filterObject);
        
        // Asıl data query'si (pagination, sorting ile)
        const data = await query
            .sort(sortObject)           // Sıralama uygula
            .skip(skip)                 // Pagination için kayıt atla
            .limit(limit)               // Sayfa boyutu kadar getir
            .exec();                    // Query'yi çalıştır

        // ===== 8. PAGINATION HESAPLAMALARI =====
        // Professional pagination bilgilerini hesapla
        
        // Toplam sayfa sayısı hesaplama
        // Math.ceil: Üste yuvarlama (örnek: 11 kayıt / 5 limit = 2.2 → 3 sayfa)
        const lastPage = Math.ceil(totalCount / limit);
        
        // Sonraki/önceki sayfa kontrolü
        const hasNextPage = page < lastPage;
        const hasPrevPage = page > 1;

        // ===== 9. URL BUILDING =====
        // Pagination URL'lerini otomatik oluşturma
        
        // Base URL oluşturma
        // req.protocol: http/https
        // req.get('host'): domain:port
        // req.baseUrl + req.path: route path'i
        const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
        
        // Mevcut query parametrelerini koru
        const queryParams = { ...req.query };
        
        // URL helper fonksiyonu
        // Sayfa numarasını değiştirip, diğer parametreleri koruyarak URL oluştur
        const buildUrl = (pageNum) => {
            const params = { ...queryParams, page: pageNum };
            
            // Query string oluşturma
            const queryString = Object.keys(params)
                .filter(key => params[key] !== undefined && params[key] !== '')
                .map(key => `${key}=${encodeURIComponent(params[key])}`)
                .join('&');
                
            return `${baseUrl}?${queryString}`;
        };

        // ===== 10. PROFESSIONAL RESPONSE FORMATI =====
        // Professional API response format (endüstri standardı)
        const response = {
            // Asıl data
            data: data,
            
            // Pagination meta bilgileri
            total: totalCount,              // Toplam kayıt sayısı
            per_page: limit,               // Sayfa başına kayıt sayısı
            current_page: page,            // Şu anki sayfa
            last_page: lastPage,           // Son sayfa numarası
            from: totalCount > 0 ? skip + 1 : null,        // Bu sayfadaki ilk kayıt no
            to: totalCount > 0 ? Math.min(skip + limit, totalCount) : null,  // Son kayıt no
            
            // Navigation URL'leri
            path: baseUrl,                          // Ana route path'i
            first_page_url: buildUrl(1),            // İlk sayfa URL'i
            last_page_url: buildUrl(lastPage),      // Son sayfa URL'i
            next_page_url: hasNextPage ? buildUrl(page + 1) : null,    // Sonraki sayfa
            prev_page_url: hasPrevPage ? buildUrl(page - 1) : null,    // Önceki sayfa
            current_page_url: buildUrl(page),       // Şu anki sayfa URL'i
            
            // Query bilgileri (API kullanımı için)
            query_info: {
                filters_applied: Object.keys(filterObject).length,     // Kaç filter aktif
                sort_by: Object.keys(sortObject)[0] || config.defaultSort,  // Hangi field'a göre sıralı
                sort_direction: Object.values(sortObject)[0] === 1 ? 'asc' : 'desc'  // Sıralama yönü
            }
        };

        return response;

    } catch (error) {
        // Hata yönetimi: Query Builder hatalarını yakala ve anlamlı mesaj ver
        throw new Error(`Query Builder Hatası: ${error.message}`);
    }
};

// Modülü dışa aktar
// CommonJS module system kullanımı
// Bu sayede diğer dosyalarda: const queryBuilder = require('./queryBuilder'); şeklinde kullanılabilir
module.exports = queryBuilder; 