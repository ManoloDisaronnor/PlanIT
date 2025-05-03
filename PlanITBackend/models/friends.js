const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('friends', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    user_send: {
      type: DataTypes.STRING(28),
      allowNull: false,
      references: {
        model: 'user',
        key: 'uid'
      }
    },
    user_requested: {
      type: DataTypes.STRING(28),
      allowNull: false,
      references: {
        model: 'user',
        key: 'uid'
      }
    },
    accepted: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'friends',
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
        name: "user_send",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "user_send" },
          { name: "user_requested" },
        ]
      },
      {
        name: "FK2_user_requested",
        using: "BTREE",
        fields: [
          { name: "user_requested" },
        ]
      },
    ]
  });
};
