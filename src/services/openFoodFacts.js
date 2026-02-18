/**
 * Open Food Facts API Service
 * Free, open-source food product database
 * API docs: https://wiki.openfoodfacts.org/API
 */

const OFF_API_URL = 'https://world.openfoodfacts.org/api/v2/product';

/**
 * Map Open Food Facts categories to local FoodStock categories
 */
const mapCategory = (categories = '', tags = []) => {
  const text = (categories + ' ' + tags.join(' ')).toLowerCase();

  if (text.match(/fruit|légume|vegetable|legume|salade|tomate|pomme|banane|carotte|oignon/)) {
    return 'fruits-legumes';
  }
  if (text.match(/viande|meat|poisson|fish|poulet|chicken|boeuf|beef|thon|sardine|saumon/)) {
    return 'viandes-poissons';
  }
  if (text.match(/lait|milk|fromage|cheese|yaourt|yogurt|beurre|butter|crème|cream|dairy|laitier/)) {
    return 'produits-laitiers';
  }
  if (text.match(/céréale|cereal|pain|bread|farine|flour|pâte|pasta|riz|rice|blé|wheat|semoule/)) {
    return 'cereales-pains';
  }
  if (text.match(/conserve|canned|boîte|can|sauce|tomate pelée|concentré/)) {
    return 'conserves';
  }
  if (text.match(/boisson|beverage|drink|jus|juice|eau|water|soda|café|coffee|thé|tea/)) {
    return 'boissons';
  }
  return 'autres';
};

/**
 * Fetch product info from Open Food Facts by barcode
 * @param {string} barcode - EAN/UPC barcode
 * @returns {object|null} Product info or null if not found
 */
export const fetchProductByBarcode = async (barcode) => {
  try {
    const response = await fetch(
      `${OFF_API_URL}/${barcode}.json?fields=product_name,product_name_fr,brands,categories,categories_tags,quantity,image_front_url,image_front_small_url,nutriscore_grade,nova_group,ingredients_text_fr,ingredients_text,packaging,stores,countries`,
      {
        headers: {
          'User-Agent': 'FoodStockApp/1.0'
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    const p = data.product;

    return {
      found: true,
      nom: p.product_name_fr || p.product_name || '',
      marque: p.brands || '',
      categorie: mapCategory(p.categories || '', p.categories_tags || []),
      categorieOriginal: p.categories || '',
      quantiteLabel: p.quantity || '',
      image: p.image_front_url || p.image_front_small_url || '',
      imageSmall: p.image_front_small_url || '',
      nutriscore: p.nutriscore_grade || '',
      novaGroup: p.nova_group || '',
      ingredients: p.ingredients_text_fr || p.ingredients_text || '',
      emballage: p.packaging || '',
      magasins: p.stores || '',
      pays: p.countries || '',
      barcode
    };
  } catch (error) {
    console.error('Open Food Facts API error:', error);
    return null;
  }
};

export default fetchProductByBarcode;
