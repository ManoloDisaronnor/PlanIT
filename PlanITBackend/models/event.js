const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('event', {
    id: {
      type: DataTypes.STRING(28),
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(1500),
      allowNull: true
    },
    starts: {
      type: DataTypes.DATE,
      allowNull: false
    },
    ends: {
      type: DataTypes.DATE,
      allowNull: false
    },
    imageUrl: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    founder: {
      type: DataTypes.STRING(28),
      allowNull: false,
      references: {
        model: 'user',
        key: 'uid'
      }
    },
    public: {
      type: DataTypes.TINYINT,
      allowNull: false
    },
    lat: {
      type: DataTypes.DECIMAL(11,8),
      allowNull: false
    },
    lng: {
      type: DataTypes.DECIMAL(11,8),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'event',
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
        name: "FK1_founder",
        using: "BTREE",
        fields: [
          { name: "founder" },
        ]
      },
    ]
  });
};
