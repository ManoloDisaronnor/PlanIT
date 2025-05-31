const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('userJoinedToEvent', {
    participant: {
      type: DataTypes.STRING(28),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'user',
        key: 'uid'
      }
    },
    event: {
      type: DataTypes.STRING(28),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'event',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'user_joined_to_event',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "participant" },
          { name: "event" },
        ]
      },
      {
        name: "FK2_public_event",
        using: "BTREE",
        fields: [
          { name: "event" },
        ]
      },
    ]
  });
};
