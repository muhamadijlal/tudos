const categoryResource = (category) => ({
  id: category.id,
  name: category.name,
});

const categoryCollection = (categories) => categories.map(categoryResource);

export { categoryCollection, categoryResource };
