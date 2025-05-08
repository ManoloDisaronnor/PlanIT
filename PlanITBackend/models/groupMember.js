const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('groupMember', {
    id: {
      type: DataTypes.STRING(28),
      allowNull: false,
      primaryKey: true
    },
    user: {
      type: DataTypes.STRING(28),
      allowNull: false,
      references: {
        model: 'user',
        key: 'uid'
      }
    },
    groups: {
      type: DataTypes.STRING(28),
      allowNull: false,
      references: {
        model: 'groups',
        key: 'id'
      }
    },
    admin: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fixed: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    joined: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'group_member',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "FK1_user",
        using: "BTREE",
        fields: [
          { name: "user" },
        ]
      },
      {
        name: "FK2_group",
        using: "BTREE",
        fields: [
          { name: "groups" },
        ]
      },
    ]
  });
};
