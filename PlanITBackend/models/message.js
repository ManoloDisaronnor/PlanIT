const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('message', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    type: {
      type: DataTypes.BLOB,
      allowNull: false
    },
    content: {
      type: DataTypes.STRING(1500),
      allowNull: false
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
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'groups',
        key: 'id'
      }
    },
    datetime: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'message',
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
        name: "FK2_id_groups",
        using: "BTREE",
        fields: [
          { name: "groups" },
        ]
      },
      {
        name: "FK1_id_user",
        using: "BTREE",
        fields: [
          { name: "user" },
        ]
      },
    ]
  });
};
