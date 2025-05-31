const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('eventsFilter', {
    event: {
      type: DataTypes.STRING(28),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'event',
        key: 'id'
      }
    },
    filters: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'filter',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'events_filter',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "event" },
          { name: "filters" },
        ]
      },
      {
        name: "FK2_filters",
        using: "BTREE",
        fields: [
          { name: "filters" },
        ]
      },
    ]
  });
};
