const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('eventImages', {
    event: {
      type: DataTypes.STRING(28),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'event',
        key: 'id'
      }
    },
    imageUrl: {
      type: DataTypes.STRING(100),
      allowNull: false,
      primaryKey: true
    },
    userUploaded: {
      type: DataTypes.STRING(28),
      allowNull: false,
      references: {
        model: 'user',
        key: 'uid'
      }
    },
    uploaded_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'event_images',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "event" },
          { name: "imageUrl" },
        ]
      },
      {
        name: "FK3_user_uploaded",
        using: "BTREE",
        fields: [
          { name: "userUploaded" },
        ]
      },
    ]
  });
};
