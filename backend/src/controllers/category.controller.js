import { categoryCollection, categoryResource } from "#resources/category.resource.js";
import * as categoryService from "#services/category.service.js";

const getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.findAll();

    res.status(200).json({
      success: true,
      data: categoryCollection(categories),
      message: "Categories retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.create(req.body);

    res.status(201).json({
      success: true,
      data: categoryResource(category),
      message: "Category created successfully",
    });
  } catch (err) {
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);
    const category = await categoryService.update(categoryId, req.body);

    res.status(200).json({
      success: true,
      data: categoryResource(category),
      message: "Category updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);
    await categoryService.remove(categoryId);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export default { getAllCategories, createCategory, updateCategory, deleteCategory };
