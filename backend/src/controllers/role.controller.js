import { roleCollection, roleResource } from "#resources/role.resource.js";
import * as roleService from "#services/role.service.js";
import { PERMISSIONS } from "#utils/permissions.js";

const getAllRoles = async (req, res, next) => {
  try {
    const roles = await roleService.findAll();

    res.status(200).json({
      success: true,
      data: roleCollection(roles),
      message: "Roles retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getRoleById = async (req, res, next) => {
  try {
    const roleId = Number(req.params.id);
    const role = await roleService.findById(roleId);

    res.status(200).json({
      success: true,
      data: roleResource(role),
      message: "Role retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getPermissions = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: PERMISSIONS,
      message: "Permissions retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const createRole = async (req, res, next) => {
  try {
    const role = await roleService.create(req.body);

    res.status(201).json({
      success: true,
      data: roleResource(role),
      message: "Role created successfully",
    });
  } catch (err) {
    next(err);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const roleId = Number(req.params.id);
    const role = await roleService.update(roleId, req.body);

    res.status(200).json({
      success: true,
      data: roleResource(role),
      message: "Role updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const deleteRole = async (req, res, next) => {
  try {
    const roleId = Number(req.params.id);
    await roleService.remove(roleId);

    res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getAllRoles,
  getRoleById,
  getPermissions,
  createRole,
  updateRole,
  deleteRole,
};
