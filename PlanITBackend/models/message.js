const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('message', {
    id: {
      type: DataTypes.STRING(28),
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
    sourceUrl: {
      type: DataTypes.STRING(100),
      allowNull: true
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
    reference: {
      type: DataTypes.STRING(28),
      allowNull: true,
      references: {
        model: 'message',
        key: 'id'
      }
    },
    reference_deleted: {
      type: DataTypes.TINYINT,
      allowNull: true
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
        name: "FK1_user_message",
        using: "BTREE",
        fields: [
          { name: "user" },
        ]
      },
      {
        name: "FK2_group_message",
        using: "BTREE",
        fields: [
          { name: "groups" },
        ]
      },
      {
        name: "FK3_message_references",
        using: "BTREE",
        fields: [
          { name: "reference" },
        ]
      },
    ]
  });
};
